package sanitize

import "testing"

func TestText_Empty(t *testing.T) {
	if got := Text(""); got != "" {
		t.Errorf("Text(\"\") = %q, want %q", got, "")
	}
}

func TestText_PlainText(t *testing.T) {
	input := "Hello, this is plain text."
	if got := Text(input); got != input {
		t.Errorf("Text(%q) = %q, want %q", input, got, input)
	}
}

func TestText_StripTags(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"simple tag", "<b>bold</b>", "bold"},
		{"script tag", "<script>alert(1)</script>", "alert(1)"},
		{"nested tags", "<div><p>text</p></div>", "text"},
		{"self-closing", "<br/>text<hr>", "text"},
		{"attributes", `<a href="x" onclick="evil()">link</a>`, "link"},
		{"HTML entities", "foo &amp; bar &lt; baz", "foo bar baz"},
		{"numeric entities", "&#60;script&#62;", "script"},
		{"mixed", "<p>Hello &amp; welcome</p>", "Hello welcome"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := Text(tc.input); got != tc.want {
				t.Errorf("Text(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestOptional(t *testing.T) {
	// nil pointer
	var nilPtr *string
	Optional(nilPtr)
	if nilPtr != nil {
		t.Error("Optional(nil) should not modify nil pointer")
	}

	// empty string
	empty := ""
	Optional(&empty)
	if empty != "" {
		t.Errorf("Optional(\"\") = %q, want %q", empty, "")
	}

	// string with HTML
	html := "<b>bold</b>"
	Optional(&html)
	if html != "bold" {
		t.Errorf("Optional(\"<b>bold</b>\") = %q, want %q", html, "bold")
	}

	// plain text
	plain := "hello"
	Optional(&plain)
	if plain != "hello" {
		t.Errorf("Optional(\"hello\") = %q, want %q", plain, "hello")
	}
}
