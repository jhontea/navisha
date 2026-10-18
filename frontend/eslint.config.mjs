import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const textSizeMessage =
  "Use the type scale (text-xs, text-sm, text-base, …) instead of text-[Npx]. See docs/DESIGN.md §12."
const colorMessage =
  "Use a color token (bg-primary, text-muted-foreground, bg-cat-*, …) instead of a hex value. See docs/DESIGN.md §12."
const textSizeSelector =
  "Literal[value=/text-\\[\\d+(\\.\\d+)?px\\]/], TemplateElement[value.raw=/text-\\[\\d+(\\.\\d+)?px\\]/]"
const hexColorSelector =
  "Literal[value=/-\\[#[0-9a-fA-F]{3,8}\\]/], TemplateElement[value.raw=/-\\[#[0-9a-fA-F]{3,8}\\]/]"

export default [
  { ignores: [".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-page-custom-font": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "warn",
        { selector: textSizeSelector, message: textSizeMessage },
        { selector: hexColorSelector, message: colorMessage },
      ],
    },
  },
  {
    // Rules from eslint-config-next 16 (React Compiler checks). They flag existing
    // patterns in ~25 files; turned off for the Next 16 upgrade and tracked for a
    // follow-up refactor, not silently ignored.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/**"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        { selector: textSizeSelector, message: textSizeMessage },
        { selector: hexColorSelector, message: colorMessage },
        {
          selector: "JSXOpeningElement[name.name=/^(button|select|textarea)$/]",
          message:
            'Use Button / Chip / SegmentedControl / SelectableRow / NativeSelect / Textarea (src/components). For a genuinely custom control, disable this line with a reason.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'][value.value='hidden']))",
          message:
            'Use Input (variant="bare" inside an input group). For a genuinely custom control, disable this line with a reason.',
        },
      ],
    },
  },
]
