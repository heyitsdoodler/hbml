import {strictEqual as equal, notStrictEqual as nequal} from "assert"
import {fullStringify} from "../src/parser.js";

const p = (src) => {
	const {ok, err} = fullStringify(src, "test env")
	return err ? err : ok
}

const f = (src) => fullStringify(src, "test env").err

describe("Macros", () => {
	describe("Built-in macros", () => {
		describe(":child", () => {
			it("Correct elements", () => {
				equal(p("--test > :child :test > 'test'"), "test")
				equal(p("--test { :child :child } :test { 'test' 'macro' }"), "testmacro")
			})
			it("Uses too many elements", () => {
				equal(p("--test > :child :test"), "")
				equal(p("--test { :child :child } :test { 'test' }"), "test")
			})
			it("Uses too few elements", () => {
				equal(p("--test > :child :test { 'test' 'macro' }"), "test")
				equal(p("--test { :child :child } :test { 'test' 'macro' 'inner' }"), "testmacro")
			})
		})
		describe(":children", () => {
			it("Existing children", () => {
				equal(p("--test > :children :test"), "")
				equal(p("--test > :children :test > 'test'"), "test")
				equal(p("--test > :children :test { 'test' 'macro' }"), "testmacro")
			})
			it("With :child after", () => {
				equal(p("--test { :children :child } :test"), "")
				equal(p("--test { :children :child } :test > 'test'"), "test")
				equal(p("--test { :children :child } :test { 'test' 'macro' }"), "testmacro")
			})
			it("With :child before", () => {
				equal(p("--test { :child :children } :test"), "")
				equal(p("--test { :child :children } :test > 'test'"), "test")
				equal(p("--test { :child :children } :test { 'test' 'macro' }"), "testmacro")
			})
		})
		describe(":consume", () => {
			it('with required elements', () => {
				equal(p("--test > :consume > :child :test > 'test'"), "test")
				equal(p("--test > :consume { :child :child } :test { 'test' 'macro' }"), "testmacro")
			})
			it('without required elements', () => {
				equal(p("--test > :consume > :child :test"), "")
				equal(p("--test > :consume { :child :child } :test > 'test'"), "")
			})
			it('get elements after', () => {
				equal(p("--test { :consume > :child :child } :test { 'test' 'macro' }"), "testmacro")
				equal(p("--test { :consume { :child :child } :child } :test { 'test' 'macro' 'again' }"), "testmacroagain")
			})
			it("3 element list with :consume", () => {
				equal(
					p(`--list { ul {
		                :consume > li > :child
		                :consume > li > :child
		                :consume > li > :child
		            }}
		            :list {"Text 1" "Text 2" "Text 3"}
		            :list {"Text 1" "Text 2"}
		            `),
					`<ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul><ul><li>Text 1</li><li>Text 2</li></ul>`
				)
			})
		})
		describe(":consume-all", () => {
			it('with required elements once', () => {
				equal(p("--test > :consume-all > :child :test > 'test'"), "test")
				equal(p("--test > :consume-all { :child :child } :test { 'test' 'macro' }"), "testmacro")
			})
			it('with required elements more than once', () => {
				equal(p("--test > :consume-all > :child :test { 'test' 'macro' }"), "testmacro")
				equal(p("--test > :consume-all { :child :child } :test { 'test' 'macro' 'test2' 'macro2' }"), "testmacrotest2macro2")
			})
			it('without required elements', () => {
				equal(p("--test > :consume-all > :child :test"), "")
				equal(p("--test > :consume-all { :child :child } :test > 'test'"), "")
			})
			it('get elements after', () => {
				equal(p("--test { :consume-all > :child :child } :test { 'test' 'macro' }"), "testmacro")
				equal(p("--test { :consume-all { :child :child } :child } :test { 'test' 'macro' 'again' }"), "testmacroagain")
			})
		})
		describe(":root", () => {
			it('Default', () => {
				equal(p(":root"), `<!DOCTYPE html><html lang="en"></html>`)
				equal(p(":root > 'Text'"), `<!DOCTYPE html><html lang="en">Text</html>`)
			})
			it("Altered lang attribute", () => {
				equal(p(`:root[lang=en-CA]`), `<!DOCTYPE html><html lang="en-CA"></html>`)
				equal(p(`:root[lang="en-CA"]`), `<!DOCTYPE html><html lang="en-CA"></html>`)
			})
		})
		it(":unwrap", () => {
			equal(p(":unwrap"), ``)
			equal(p(`:unwrap {
					"Text 1"
					{{"Text 2"}{p}}
					// A comment
					{}
				}`),
				`Text 1<div>Text 2</div><div><p></p></div><!-- A comment-->`
			)
		})
	})
	it("Nested :consume and :consume-all", () => {
		equal(p("--test > :consume { :child :consume > :child } :test { 't1' 't2' } :test > 't1'"), "t1t2t1")
	})
	it("Simple replacements", () => {
		equal(p("--macro-string > 'Hello, world!' :macro-string"), "Hello, world!")
		equal(p("--macro-multi-string { 'Hello,'' world!' } :macro-multi-string"), "Hello, world!")
		equal(p("--macro-multi-string > { 'Hello,'' world!' } :macro-multi-string"), "<div>Hello, world!</div>")
		equal(p("--macro-multi-string {{ 'Hello,'' world!'}} :macro-multi-string"), "<div>Hello, world!</div>")
		equal(p("--nested-divs { {} {{}} } :nested-divs"), "<div></div><div><div></div></div>")
		equal(p("--nested-divs > { {} {{}} } :nested-divs"), "<div><div></div><div><div></div></div></div>")

		equal(p(`--head-base {
                    script[src=script1.js]
                    link[rel='stylesheet' href='style.css']
                } :head-base.class`),
			`<script src="script1.js" class="class"></script><link rel="stylesheet" href="style.css" class="class"/>`)
	})
	describe("Attributes", () => {
		it('Single root elements', () => {
			equal(p(`--test > p > "test" :test.class1`), `<p class="class1">test</p>`)
			equal(p(`--test > "test" :test.class1`), `test`)
			equal(p(`--test > p > "test" :test[attr=value]`), `<p attr="value">test</p>`)
			equal(p(`--test > "test" :test[attr=value]`), `test`)
			equal(p(`--test > p > "test" :test#id`), `<p id="id">test</p>`)
			equal(p(`--test > "test" :test#id`), `test`)
		})
		it('Multiple root elements', () => {
			equal(p(`--test { p > "test" h1 > "other" } :test.class1`), `<p class="class1">test</p><h1 class="class1">other</h1>`)
			equal(p(`--test { p > "test" h1 > "other" } :test[attr=value]`), `<p attr="value">test</p><h1 attr="value">other</h1>`)
			nequal(f(`--test { p > "test" h1 > "other" } :test#id`), "")
		})
	})
	it("Void macro with implicit div after", () => {
		equal(p("--test > 'test' :test > 'other'"), `test<div>other</div>`)
	})
	describe("Shadowing macros", () => {
		it("Correctly shadowing macros", () => {
			equal(p(`--test > "outer" { --test > "inner" :test } :test`), "<div>inner</div>outer")
			equal(p(`--test { "outer " :child } { --test { "inner " :child } :test > "macro" } :test > "parent macro"`), "<div>inner macro</div>outer parent macro")
		})
		it("Attempted shadowing with change of voidness", () => {
			nequal(f(`--test > "outer" { --test > :child :test > "fail" } :test`), "")
			nequal(f(`--test > :child { --test > "fail" :test > "fail" } :test`), "")
			nequal(f(`--test { "outer " :child } { --test > "inner :test } :test > "parent macro"`), "")
			nequal(f(`--test > "test" { --test { "fail" :consume > :child } :test } :test`), "")
		})
	})
	describe("Other things", () => {
		it('Calling a macro from under another macro call', () => {
			equal(p(`--replace { "t1" "t2" "t3" }
				--divify > :consume-all >> :child
				:divify > :replace
				--pass > :divify > :children
				:pass { "t1" "t2" "t3" }
				:pass > :replace`),
				`<div>t1</div><div>t2</div><div>t3</div><div>t1</div><div>t2</div><div>t3</div><div>t1</div><div>t2</div><div>t3</div>`
			)
		})
	})
	describe("Sample macros", () => {
		it("3 element list", () => {
			equal(
				p(`
            --list {
                ul {
                    li > :child
                    li > :child
                    li > :child
                }
            }
            :list {"Text 1" "Text 2" "Text 3"}
            :list {"Text 1" "Text 2"}
            `),
				`<ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul><ul><li>Text 1</li><li>Text 2</li><li></li></ul>`
			)
		})
		it("Better list", () => {
			equal(
				p("--better-list { ul > :consume-all > li > :child } :better-list :better-list > 'elem1' :better-list { 'elem1' 'elem2' 'elem3' }"),
				`<ul></ul><ul><li>elem1</li></ul><ul><li>elem1</li><li>elem2</li><li>elem3</li></ul>`
			)
		})
		it("Section macro", () => {
			equal(
				p(`
            --section-macro > section {
                h2 > :child
                div > :children
            }
            :section-macro {"Heading 1" p > "Paragraph 1" p > "Paragraph 2"}
            :section-macro#section-id {"Heading 1" p > "Paragraph 1" p > "Paragraph 2" p > "Paragraph 3"}
            `),
				`<section><h2>Heading 1</h2><div><p>Paragraph 1</p><p>Paragraph 2</p></div></section><section id="section-id"><h2>Heading 1</h2><div><p>Paragraph 1</p><p>Paragraph 2</p><p>Paragraph 3</p></div></section>`
			)
		})
		it("Section with heading and inner list", () => {
			equal(p(`--list {
	                h2 > :child
	                ul {
	                    :consume-all > li > :child
	                }
	            }
	            :list {"Heading" "Text 1"}
	            :list {"Heading" "Text 1" "Text 2" "Text 3"}`),
				`<h2>Heading</h2><ul><li>Text 1</li></ul><h2>Heading</h2><ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul>`
			)
		})
		it("2 column table", () => {
			equal(
				p(`
            --table > table {
                thead { tr { th > :child th > :child } }
                tbody > :consume-all {
                    tr { td > :child td > :child }
                }
            }
            :table#test-id { 
                "Column 1" "Column 2"
                "Row 1"    "Value 1"
                "Row 2"    "Value 2"
                "Row 3"
            }
            `),
				`<table id="test-id"><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Row 1</td><td>Value 1</td></tr><tr><td>Row 2</td><td>Value 2</td></tr></tbody></table>`)
		})
	})
	describe("Importing macros", () => {
		equal(p(`@import ./test/importable_macros
            :external-macro`), `Hello, world!`)
		equal(p(`@import ./test/importable_macros.hbml
            :external-macro2`), `<p>Hello, world!</p>`)
		equal(p(`@import ./test/importable_macros.hbml namespace
            :namespace:external-macro`), `Hello, world!`)
	})
})


// describe("Macros", () => {
// 	it(":child-at(<index>)", () => {
// 		equal(p(`
//             --index {
//                 p > :child-at(1)
//                 p > :child-at(0)
//                 p > :child
//                 p > :child-at(0)
//                 p > :children
//                 p > :child-at(2)
//             }
//             :index {"Text 1" "Text 2" "Text 3"}
//             `), `<p>Text 2</p><p>Text 1</p><p>Text 1</p><p>Text 1</p><p>Text 2Text3</p><p>Text 3</p>`)
// 	})
// })
