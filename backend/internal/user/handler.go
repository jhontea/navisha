package user

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase      UsecaseInterface
	frontendURL  string // redirect destination after successful OAuth callback
	cookieDomain string // cookie domain for cross-subdomain auth (.navisha.cloud)
}

func NewHandler(usecase UsecaseInterface, frontendURL, cookieDomain string) *Handler {
	return &Handler{usecase: usecase, frontendURL: frontendURL, cookieDomain: cookieDomain}
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/auth/google", h.GoogleRedirect)
	g.GET("/auth/google/callback", h.GoogleCallback)
	g.POST("/auth/logout", h.Logout, authMiddleware)
	g.POST("/auth/refresh", h.Refresh)
	g.GET("/auth/me", h.Me, authMiddleware)
}

// GoogleRedirect generates a random CSRF state, stores it in a short-lived cookie,
// and redirects the user to Google's consent screen.
func (h *Handler) GoogleRedirect(c echo.Context) error {
	state := randomState()
	// SameSite=None + Secure required for cross-domain OAuth flow:
	// frontend is on navisha.cloud, backend/callback is on api.navisha.cloud
	c.SetCookie(&http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
	return c.Redirect(http.StatusTemporaryRedirect, h.usecase.GoogleAuthURL(state))
}

// GoogleCallback validates the OAuth state, exchanges the code for user info,
// upserts the user, issues JWT cookies, then redirects back to the frontend.
func (h *Handler) GoogleCallback(c echo.Context) error {
	stateCookie, err := c.Cookie("oauth_state")
	if err != nil || stateCookie.Value != c.QueryParam("state") {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid oauth state")
	}
	c.SetCookie(&http.Cookie{Name: "oauth_state", Value: "", MaxAge: -1, Path: "/"})

	code := c.QueryParam("code")
	if code == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "missing code")
	}

	_, tokens, err := h.usecase.GoogleLogin(c.Request().Context(), code)
	if err != nil {
		if errors.Is(err, ErrNotAllowed) {
			return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=not_allowed")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "login failed")
	}

	h.setTokenCookies(c, tokens.AccessToken, tokens.RefreshToken)
	return c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/auth/callback")
}

// Logout clears auth cookies.
func (h *Handler) Logout(c echo.Context) error {
	h.clearTokenCookies(c)
	return c.JSON(http.StatusOK, map[string]string{"message": "logged out"})
}

// Refresh validates the refresh token cookie and issues a new token pair.
func (h *Handler) Refresh(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing refresh token")
	}

	tokens, err := h.usecase.RefreshTokens(cookie.Value)
	if err != nil {
		h.clearTokenCookies(c)
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid refresh token")
	}

	h.setTokenCookies(c, tokens.AccessToken, tokens.RefreshToken)
	return c.JSON(http.StatusOK, map[string]string{"message": "refreshed"})
}

// Me returns the authenticated user's profile.
func (h *Handler) Me(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)

	usr, err := h.usecase.Me(userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "user not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"id":         usr.ID,
		"email":      usr.Email,
		"name":       usr.Name,
		"avatar_url": usr.AvatarURL,
	})
}

func (h *Handler) setTokenCookies(c echo.Context, accessToken, refreshToken string) {
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   3600, // 1 hour
		HttpOnly: true,
		Secure:   h.cookieDomain != "",
		SameSite: http.SameSiteNoneMode,
	})
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   604800, // 7 days
		HttpOnly: true,
		Secure:   h.cookieDomain != "",
		SameSite: http.SameSiteNoneMode,
	})
}

func (h *Handler) clearTokenCookies(c echo.Context) {
	for _, name := range []string{"access_token", "refresh_token"} {
		c.SetCookie(&http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			Domain:   h.cookieDomain,
			Expires:  time.Unix(0, 0),
			MaxAge:   -1,
			Secure:   h.cookieDomain != "",
			SameSite: http.SameSiteNoneMode,
		})
	}
}

func randomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
