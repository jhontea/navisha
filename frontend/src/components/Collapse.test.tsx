import { AnimatePresence } from "motion/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Collapse } from "./Collapse"

describe("Collapse", () => {
  it("renders a list already on screen at full height, open to focus", () => {
    const html = renderToStaticMarkup(
      <AnimatePresence initial={false}>
        <Collapse key="a" as="li" rowId="row-1">
          Row
        </Collapse>
      </AnimatePresence>,
    )
    expect(html).toMatch(/^<li data-row-id="row-1"/)
    expect(html).not.toContain("height:0")
    expect(html).not.toContain("inert")
    expect(html).not.toContain("data-exiting")
  })

  it("starts a newly added child collapsed", () => {
    const html = renderToStaticMarkup(<Collapse>Card</Collapse>)
    expect(html).toMatch(/^<div style="height:0px;opacity:0"/)
  })
})
