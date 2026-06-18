package user

import "context"

// mockUsecase satisfies UsecaseInterface. Each field captures last input or
// the canned response to return.
type mockUsecase struct {
	authURL string

	loginCalls  int
	loginCode   string
	loginUser   *User
	loginTokens *Tokens
	loginErr    error

	meCalls int
	meID    string
	meUser  *User
	meErr   error

	refreshCalls  int
	refreshToken  string
	refreshResult *Tokens
	refreshErr    error
}

func (m *mockUsecase) GoogleAuthURL(state string) string {
	if m.authURL == "" {
		return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state
	}
	return m.authURL + "?state=" + state
}

func (m *mockUsecase) GoogleLogin(_ context.Context, code string) (*User, *Tokens, error) {
	m.loginCalls++
	m.loginCode = code
	return m.loginUser, m.loginTokens, m.loginErr
}

func (m *mockUsecase) Me(id string) (*User, error) {
	m.meCalls++
	m.meID = id
	return m.meUser, m.meErr
}

func (m *mockUsecase) RefreshTokens(refreshToken string) (*Tokens, error) {
	m.refreshCalls++
	m.refreshToken = refreshToken
	return m.refreshResult, m.refreshErr
}
