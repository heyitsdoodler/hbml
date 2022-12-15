import {strictEqual as equal} from "assert"
import {fullStringify} from "../src/parser.js";

const p = (src, ) => {
    const {ok, err} = fullStringify(src, "test env")
    return err ? err : ok
}

describe("Testing HBML: parser.js", () => {
    describe("Strings", () => {
        it("Double quotes", () => {
            equal(p(`"Test ""string"`), "Test string")
            equal(p(`" Test string "`), " Test string ")
            equal(p(`"Test\n string"`), "Test string")
        })
        it("Single quotes", () => {
            equal(p(`'Test ''string'`), "Test string")
            equal(p(`' Test string '`), " Test string ")
            equal(p(`'Test\n string'`), "Test string")
        })
        it("Backticks", () => {
            equal(p(`\`Test \`\`string\``), "Test string")
            equal(p(`\` Test string \``), " Test string ")
            equal(p(`\`Test\n string\``), "Test\n string")
        })
        it("Other", () => {
            equal(p(`""''\`\``), "")
            equal(p(`"\\\\ backslash can appear inside string literal, even before an escape \\\\\\", but <> can't"`), "\\ backslash can appear inside string literal, even before an escape \\\", but &lt;&gt; can't")
            equal(p(`"All "'working '\`together\``), "All working together")
            equal(p(`hr"Let's"br'break'br"this"br\`up!\``), "<hr/>Let's<br/>break<br/>this<br/>up!")
            equal(p(`"Double \nquotes a"'nd single\n quotes ignore newlines'\`\nbut backticks keep them\``), "Double quotes and single quotes ignore newlines\nbut backticks keep them")
        })
    })
    describe("Comments", () => {
        it("Single line comments",() => {
            equal(p("//"), "<!---->")
            equal(p("//\n"), "<!---->")
            equal(p("//test comment"), "<!--test comment-->")
            equal(p("// test comment"), "<!-- test comment-->")
            equal(p("// test comment\n"), "<!-- test comment-->")
        })
        it("Multiline comments",() => {
            equal(p("/**/"), "<!---->")
            equal(p("/* test comment */"), "<!-- test comment -->")
            equal(p("/* test" +
                "comment */"), "<!-- test" +
                "comment -->")
        })
    })
    describe("Elements", () => {
        it("Blocks", () => {
            equal(p("div {}"), "<div></div>")
            equal(p("div>p"), "<div><p></p></div>")
            equal(p("div> p"), "<div><p></p></div>")
            equal(p("div > p"), "<div><p></p></div>")
            equal(p("div{}"), "<div></div>")
            equal(p("div { }"), "<div></div>")
            equal(p("div {\n}"), "<div></div>")
            equal(p("div {'Test'}"), "<div>Test</div>")
            equal(p("div { 'Test' }"), "<div>Test</div>")
            equal(p("div {div}"), "<div><div></div></div>")
            equal(p("div { div }"), "<div><div></div></div>")
            equal(p("div {div > 'Test'}"), "<div><div>Test</div></div>")
            equal(p(">>i"), "<div><div><i></i></div></div>")
            equal(p("div{}div{ }div{\n}"), "<div></div><div></div><div></div>")
        })
        it("Block Implicits (div)", () => {
            equal(p("{}"), "<div></div>")
            equal(p(">"), "<div></div>")
            equal(p("> p"), "<div><p></p></div>")
        })
        it("Inline Implicits (span)", () => {
            equal(p("span > {}"), "<span><span></span></span>")
            equal(p("i {{'Test'}p}"), "<i><span>Test</span><p></p></i>")
        })
        it("IDs and Classes", () => {
            equal(p("div#my-id"), `<div id="my-id"></div>`)
            equal(p(".class"), `<div class="class"></div>`)
            equal(p(".class.class2.class3"), `<div class="class class2 class3"></div>`)
            equal(p("div#my-id.class.class2.class3"), `<div id="my-id" class="class class2 class3"></div>`)
        })
        it("Attributes", () => {
            equal(p("span[style=color:red;] > 'Text'"), `<span style="color:red;">Text</span>`)
            equal(p("#my-id.class.class2[data-attribute]"), `<div id="my-id" class="class class2" data-attribute></div>`)
            equal(p("link[href=https://cool-website.com/]\n" +
                "        link[rel=stylesheet href=./local-styles/style.css]\n" +
                "        meta[charset=\"UTF-8\"]\n" +
                "        meta[\n" +
                "            name=`viewport`\n" +
                "            content='width=device-width, initial-scale=1'\n" +
                "        ]"),
                `<link href="https://cool-website.com/"/><link rel="stylesheet" href="./local-styles/style.css"/><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>`
            )
            equal(p('input#input-id[type=checkbox name="checkboxName" checked]\n' +
                '        [data-attribute=Test\\ value1]\n' +
                '        [data-attribute="Test value2"]\n' +
                '        [data-attribute=\'Test value3\']\n' +
                '        [data-attribute=\`Test value4\`]\n' +
                '        [data-first-attribute="First attr" data-second-attribute=\'Second attr\']> "Test"'),
                `<input id="input-id" type="checkbox" name="checkboxName" checked/><div data-attribute="Test value1"></div><div data-attribute="Test value2"></div><div data-attribute="Test value3"></div><div data-attribute="Test value4"></div><div data-first-attribute="First attr" data-second-attribute="Second attr">Test</div>`)
        })


        it("Other", () => {
            equal(p("h1>h2>h3>\n'Layered'"), "<h1><h2><h3>Layered</h3></h2></h1>")
            equal(p(".l1 > span.l2 > .l3 > 'Layered'"), `<div class="l1"><span class="l2"><span class="l3">Layered</span></span></div>`)
            equal(p("p> {'Text'}"), "<p><div>Text</div></p>")
            equal(p("p >'Text'"), "<p>Text</p>")
            equal(p("section"), "<section></section>")
        })
    })
    // All test below this point require macros to be functioning, they may also need corrections due to being quickly hand parsed
    describe("Macros", () => {
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
        it("Scopes", () => {
            equal(p(`--scope > {"Global"}
                :scope
                :root {
                    :scope
                    --scope > {":root"}
                    section {
                        :scope
                        --scope > {"section"}
                        :scope
                    }
                    :scope
                }
                :scope
                `),
                `<div>Global</div><!DOCTYPE html><html lang="en"><div>Global</div><section><div>:root</div><div>section</div></section><div>:root</div></html><div>Global</div>`)
        })
        it(":child and :children", () => {
            equal(p(`
            --list {
                ul {
                    li > :child
                    li > :child
                    li > :child
                }
            }
            :list {"Text 1" "Text 2" "Text 3"}
            :list {"Text 1" "Text 2"}
            `), `<ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul><ul><li>Text 1</li><li>Text 2</li><li></li></ul>`)

            equal(p(`
            --section-macro > section {
                h2 > :child
                div > :children
            }
            :section-macro {"Heading 1" p > "Paragraph 1" p > "Paragraph 2"}
            :section-macro#section-id {"Heading 1" p > "Paragraph 1" p > "Paragraph 2" p > "Paragraph 3"}
            `), `<section><h2>Heading 1</h2><div><p>Paragraph 1</p><p>Paragraph 2</p></div></section><section id="section-id"><h2>Heading 1</h2><div><p>Paragraph 1</p><p>Paragraph 2</p><p>Paragraph 3</p></div></section>`)

            equal(p(`
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
            `), `<table id="test-id"><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Row 1</td><td>Value 1</td></tr><tr><td>Row 2</td><td>Value 2</td></tr></tbody></table>`)

        })
        it(":consume and :consume-all", () => {
            equal(p(`
            --list {
                ul {
                    :consume > li > :child
                    :consume > li > :child
                    :consume > li > :child
                }
            }
            :list {"Text 1" "Text 2" "Text 3"}
            :list {"Text 1" "Text 2"}
            `), `<ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul><ul><li>Text 1</li><li>Text 2</li></ul>`)

            equal(p(`
            --list {
                h2 > :child
                ul {
                    :consume-all > li > :child
                }
            }
            :list {"Heading" "Text 1"}
            :list {"Heading" "Text 1" "Text 2" "Text 3"}
            `), `<h2>Heading</h2><ul><li>Text 1</li></ul><h2>Heading</h2><ul><li>Text 1</li><li>Text 2</li><li>Text 3</li></ul>`)
        })
        it("Imports", () => {
            equal(p(`@import ./test/importable_macros
            :external-macro`), `Hello, world!`)
            equal(p(`@import ./test/importable_macros.hbml
            :external-macro2`), `<h1>Hello, world!</h1>`)
            equal(p(`@import ./test/importable_macros.hbml namespace
            :namespace:external-macro`), `Hello, world!`)
        })

        describe("Built-in validation", () => {
            it('Default :root', () => {
                equal(p(":root"), `<!DOCTYPE html><html lang="en"></html>`)
                equal(p(":root > 'Text'"), `<!DOCTYPE html><html lang="en">Text</html>`)
            })
            it(':root with modified lang attribute', () => {
                equal(p(`:root[lang=en-CA]`), `<!DOCTYPE html><html lang="en-CA"></html>`)
                equal(p(`:root[lang="en-CA"]`), `<!DOCTYPE html><html lang="en-CA"></html>`)
            })
        })
    })
    describe('Full Pages', () => {
        it("Small", () => {
            equal(p(`:root[lang=en] {
                    head {
                        title > "Page title"
                    }
                
                    body {
                        h1 > "Heading Level 1"
                        section {
                            p > "Paragraph 1"
                            p > "Paragraph 2"
                        }
                    }
                }`),
                `<!DOCTYPE html><html lang="en"><head><title>Page title</title></head><body><h1>Heading Level 1</h1><section><p>Paragraph 1</p><p>Paragraph 2</p></section></body></html>`
            )
        })
        it("Large", () => {
            equal(p(`:root[lang="en-CA"] {
                head {
                    meta[charset="UTF-8"]
                    meta[
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    ]
            
                    title > "Title of webpage"
                    style > "
                        body {
                            font-family: 'Roboto', sans-serif;
                        }
            
                        .highlight {
                            background-color: yellow;
                        }
                    "
                }
                body {
            
                    /* Various inline headings */
            
                    section {
                        h1 > "Heading 1"
                        h2 > "Heading 2"
                        h3 > "Heading 3"
                        h4 > "Heading 4"
                        h5 > "Heading 5"
                        h6 > "Heading 6"
                    }
            
            
                    /* Divs and classes with multiple children */
            
                    div {
                        p { "A paragraph inside a div" }
                        p > "This also works for a single piece of text"
                    }
            
                    .layer-1 > .layer-2 > .layer-3 {
                        "Text directly inside the .layer-3 div"
            
                        br
                        > "Some text inside an implicit div"
                        div > "Other text inside an explicit div"
                        br
            
                        "Text inside the .layer-3 div after the child elements"
                    }
            
                    a[href="./"] > "Clickable link"
            
                    /* Combination of inlining and multiple children */
            
                    p {"Text with a highlighted part " span.highlight>"right here" " followed by more text"}
            
                    /* Testing different strings */
                    div {
                        "Double quote string" br 'Single quote string' br \`Back tick string\`
                    }
                    /* some strange but technically allowable syntax */
                    a[at1="1"
                    at2="2"]
                }
            }`),
            `<!DOCTYPE html><html lang="en-CA"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Title of webpage</title><style>                        body {                            font-family: 'Roboto', sans-serif;                        }                                    .highlight {                            background-color: yellow;                        }                    </style></head><body><!-- Various inline headings --><section><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6></section><!-- Divs and classes with multiple children --><div><p>A paragraph inside a div</p><p>This also works for a single piece of text</p></div><div class="layer-1"><div class="layer-2"><div class="layer-3">Text directly inside the .layer-3 div<br/><div>Some text inside an implicit div</div><div>Other text inside an explicit div</div><br/>Text inside the .layer-3 div after the child elements</div></div></div><a href="./">Clickable link</a><!-- Combination of inlining and multiple children --><p>Text with a highlighted part <span class="highlight">right here</span> followed by more text</p><!-- Testing different strings --><div>Double quote string<br/>Single quote string<br/>Back tick string</div><!-- some strange but technically allowable syntax --><a at1="1" at2="2"></a></body></html>`
            )
        })
    });
})