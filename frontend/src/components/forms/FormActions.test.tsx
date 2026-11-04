import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FormActions } from "./FormActions"

describe("FormActions", () => {
  it("renders no alert without an error", () => {
    expect(renderToStaticMarkup(<FormActions submitLabel="Save" />)).not.toContain('role="alert"')
  })

  it("announces the save error above the buttons", () => {
    const html = renderToStaticMarkup(<FormActions submitLabel="Save" error="Couldn't save." errorKey={1} />)
    expect(html).toMatch(/<p role="alert" class="animate-save-error[^"]*">.*Couldn&#x27;t save\.<\/p>.*<button/)
  })
})
