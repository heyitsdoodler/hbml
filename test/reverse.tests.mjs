import {strictEqual as equal} from "assert"
import {reverse} from "../src/commands/reverse.js";

const p = (src) => {
	const {ok, err} = reverse(src)
	return err ? err : ok.trim()
}

describe("Reverse tests", () => {
    it('Empty tags', () => {
        equal(p(`<div></div>`), `div`)
        equal(p(`<span></span>`), `span`)
        equal(p(`<b></b>`), `b`)
    });

    it('Inline tags / Single child nesting chain', () => {
        equal(p(`<b>Text</b>`), `b > "Text"`)
        equal(p(`<div>Text</div>`), `div > "Text"`)
        equal(p(`<div><span></span></div>`), `div > span`)
        equal(p(`<div><span>Text</span></div>`), `div > span > "Text"`)
    });

	it('Multi child nesting chain' , () => {
		equal(p(`<b><div>Text</div>Text</b>`), `b {\n\tdiv > "Text"\n\t"Text"\n}`)
	});

    it("Root macro", () => {
        equal(p(`<!DOCTYPE html><html lang="en"></html>`), `:root`)
        equal(p(`<!DOCTYPE html><html lang="en-CA"></html>`), `:root[lang="en-CA"]`)
    })

    it("Large example", () => {
            equal(p(`<!DOCTYPE html><html lang=en-CA><head><meta charset=UTF-8><meta name=viewport content="width=device-width, initial-scale=1"><title>Title of webpage</title><style>body {\n\t\tfont-family: 'Roboto', sans-serif;\n\t}\n\n\t.highlight {\n\t\tbackground-color: yellow;\n\t}</style></head><body><!-- Various inline headings --><section><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6></section><!-- Divs and classes with multiple children --><div><p>A paragraph inside a div<p>This also works for a single piece of text</div><div class=layer-1><div class=layer-2><div class=layer-3>Text directly inside the .layer-3 div<br><div>Some text inside an implicit div</div><div>Other text inside an explicit div</div><br>Text inside the .layer-3 div after the child elements</div></div></div><a href=./ >Clickable link</a><!-- Combination of inlining and multiple children --><p>Text with a highlighted part <span class=highlight>right here</span> followed by more text</p><!-- Testing different strings --><div>Double quote string<br>Single quote string<br>Back tick string</div><!-- some strange but technically allowable syntax --><a at1=1 at2=2></a>`),
    `:root[lang="en-CA"] {\n\thead {\n\t\tmeta[charset="UTF-8"]\n\t\tmeta[name="viewport" content="width=device-width, initial-scale=1"]\n\t\ttitle > "Title of webpage"\n\t\tstyle > "body {\n\t\tfont-family: 'Roboto', sans-serif;\n\t}\n\n\t.highlight {\n\t\tbackground-color: yellow;\n\t}"\n\t}\n\tbody {\n\t\t/* Various inline headings */\n\t\tsection {\n\t\t\th1 > "Heading 1"\n\t\t\th2 > "Heading 2"\n\t\t\th3 > "Heading 3"\n\t\t\th4 > "Heading 4"\n\t\t\th5 > "Heading 5"\n\t\t\th6 > "Heading 6"\n\t\t}\n\t\t/* Divs and classes with multiple children */\n\t\tdiv {\n\t\t\tp > "A paragraph inside a div"\n\t\t\tp > "This also works for a single piece of text"\n\t\t}\n\t\tdiv.layer-1 > div.layer-2 > div.layer-3 {\n\t\t\t"Text directly inside the .layer-3 div"\n\t\t\tbr\n\t\t\tdiv > "Some text inside an implicit div"\n\t\t\tdiv > "Other text inside an explicit div"\n\t\t\tbr\n\t\t\t"Text inside the .layer-3 div after the child elements"\n\t\t}\n\t\ta[href="./"] > "Clickable link"\n\t\t/* Combination of inlining and multiple children */\n\t\tp {\n\t\t\t"Text with a highlighted part "\n\t\t\tspan.highlight > "right here"\n\t\t\t" followed by more text"\n\t\t}\n\t\t/* Testing different strings */\n\t\tdiv {\n\t\t\t"Double quote string"\n\t\t\tbr\n\t\t\t"Single quote string"\n\t\t\tbr\n\t\t\t"Back tick string"\n\t\t}\n\t\t/* some strange but technically allowable syntax */\n\t\ta[at1="1" at2="2"]\n\t}\n}`)
    })
})
