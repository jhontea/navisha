package currency

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/currency/rates", h.Rates, authMiddleware)
	g.GET("/currency/convert", h.Convert, authMiddleware)
	g.GET("/currency/supported", h.Supported, authMiddleware)
}

func (h *Handler) Rates(c echo.Context) error {
	base := strings.ToUpper(c.QueryParam("base"))
	if base == "" {
		base = "USD"
	}
	rates, err := h.usecase.Rates(base)
	if err != nil {
		return mapErr(err)
	}
	items := make([]map[string]any, 0, len(rates))
	for _, r := range rates {
		items = append(items, map[string]any{
			"currency":   r.Target,
			"rate":       r.Rate,
			"symbol":     Symbol(r.Target),
			"fetched_at": r.FetchedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"base":  base,
		"rates": items,
	})
}

func (h *Handler) Convert(c echo.Context) error {
	from := strings.ToUpper(c.QueryParam("from"))
	to := strings.ToUpper(c.QueryParam("to"))
	amountStr := c.QueryParam("amount")
	if from == "" || to == "" || amountStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "from, to, amount required")
	}
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid amount")
	}

	converted, rate, err := h.usecase.Convert(from, to, amount)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"from":             from,
		"to":               to,
		"amount":           amount,
		"converted_amount": converted,
		"rate":             rate,
	})
}

func (h *Handler) Supported(c echo.Context) error {
	items := make([]map[string]string, 0, len(SupportedCurrencies))
	for _, code := range SupportedCurrencies {
		items = append(items, map[string]string{
			"code":   code,
			"symbol": Symbol(code),
			"name":   Name(code),
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"supported": items})
}

func mapErr(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrUnsupported, Code: http.StatusBadRequest, Message: "unsupported currency"},
	)
}
