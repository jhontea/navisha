import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { lazyPreload } from "./lazyPreload"

const Form = () => <form>form</form>
const fallback = () => <p>loading</p>

describe("lazyPreload", () => {
  it("shows the fallback before the module has loaded", () => {
    const Lazy = lazyPreload(() => Promise.resolve(Form), fallback)
    expect(renderToStaticMarkup(<Lazy />)).toBe("<p>loading</p>")
  })

  it("renders the component directly once preloaded", async () => {
    const Lazy = lazyPreload(() => Promise.resolve(Form), fallback)
    await Lazy.preload()
    expect(renderToStaticMarkup(<Lazy />)).toBe("<form>form</form>")
  })

  it("keeps the fallback after a failed load, and a later load still works", async () => {
    const load = vi.fn<() => Promise<typeof Form>>().mockRejectedValueOnce(new Error("ChunkLoadError")).mockResolvedValue(Form)
    const Lazy = lazyPreload(load, fallback)
    await expect(Lazy.preload()).rejects.toThrow("ChunkLoadError")
    expect(renderToStaticMarkup(<Lazy />)).toBe("<p>loading</p>")
    await Lazy.preload()
    expect(renderToStaticMarkup(<Lazy />)).toBe("<form>form</form>")
  })
})
