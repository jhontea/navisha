import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FormActions, focusWasDropped } from "./FormActions"

describe("FormActions", () => {
  it("renders no alert without an error", () => {
    expect(renderToStaticMarkup(<FormActions submitLabel="Save" />)).not.toContain('role="alert"')
  })

  it("announces the save error above the buttons", () => {
    const html = renderToStaticMarkup(<FormActions submitLabel="Save" error="Couldn't save." errorKey={1} />)
    expect(html).toMatch(/<p role="alert" class="animate-save-error[^"]*">.*Couldn&#x27;t save\.<\/p>.*<button/)
  })

  it("restores focus only when it fell to an ancestor of Save", () => {
    const button = {} as Element
    const ancestor = { contains: (el: Element) => el === button } as Element
    const sibling = { contains: () => false } as unknown as Element
    expect(focusWasDropped(ancestor, button)).toBe(true) // body, sheet or form
    expect(focusWasDropped(null, button)).toBe(true)
    expect(focusWasDropped(sibling, button)).toBe(false) // the user moved on to a field
    expect(focusWasDropped(ancestor, null)).toBe(false)
  })
})
