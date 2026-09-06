# Third-party artwork

Code dependencies carry their licences in `node_modules` and `package-lock.json`.
This file is for artwork that has been **copied into the repository**, where
there is no package manifest to read the terms off.

## Phosphor Icons — MIT

`src/components/studio2/icons.art.js` holds SVG path data extracted from
[Phosphor Icons](https://phosphoricons.com) by `scripts/generate-icons.mjs`,
which reads it out of the `@phosphor-icons/core` devDependency. The artwork is
copied in rather than imported so the client bundle carries the paths alone and
none of the React packaging — see the comment at the top of that script.

> MIT © [Phosphor Icons](https://github.com/phosphor-icons)
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of
> this software and associated documentation files (the "Software"), to deal in
> the Software without restriction, including without limitation the rights to
> use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
> of the Software, and to permit persons to whom the Software is furnished to do
> so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

MIT asks only that this notice travel with the copy. There is no attribution
requirement on the rendered page, which is the reason this set was chosen over
a stock-icon library.

## Removed: the `public/icons` PNGs

Twenty-two PNGs lived in `public/icons` and were rendered as CSS masks by the
old icon set. Their filenames (`multiple-users-silhouette.png`,
`request-for-proposal.png`, `ready-stock.png`) are
[Flaticon](https://www.flaticon.com/legal) slugs, and Flaticon's free tier
requires **visible attribution on every page the icons appear on**. No
attribution existed anywhere in this repository, and a tenant-facing ERP sidebar
is not a place to carry a backlink, so they were deleted rather than credited
when the set moved to Phosphor. Recorded here so nobody restores them from git
history without knowing what the terms are.
