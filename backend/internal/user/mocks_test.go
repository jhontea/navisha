package user

import "context"

// mockUsecase satisfies UsecaseInterface. Each field captures last input or
// the canned response to return.
type mockUsecase struct {
	authURL      string
	authVerifier string

	loginCalls  int
	loginCode   string
	loginVerifier string
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

func (m *mockUsecase) GoogleAuthURL(state, verifier string) string {
	m.authVerifier = verifier
	if m.authURL == "" {
		return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state
	}
	return m.authURL + "?state=" + state
}

func (m *mockUsecase) GoogleLogin(_ context.Context, code, verifier string) (*User, *Tokens, error) {
	m.loginCalls++
	m.loginCode = code
	m.loginVerifier = verifier
	return m.loginUser, m.loginTokens, m.loginErr
}

func (m *mockUsecase) Me(_ context.Context, id string) (*User, error) {
	m.meCalls++
	m.meID = id
	return m.meUser, m.meErr
}

func (m *mockUsecase) RefreshTokens(_ context.Context, refreshToken string) (*Tokens, error) {
	m.refreshCalls++
	m.refreshToken = refreshToken
	return m.refreshResult, m.refreshErr
}

func (m *mockUsecase) Logout(_ context.Context, _ string) error { return nil }
