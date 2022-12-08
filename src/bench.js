import Benchmark from "benchmark"
import {parseHBML} from "./old_parser.js";
import {fullStringify} from "./parser.js";

let suite = new Benchmark.Suite("HBML parser benchmark")

const test_str = `
:root[lang="en-CA"] {
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
        a[at1="1"
        at2="2"]
    }
}
`

suite.add("current", () => {
	parseHBML(test_str)
})
.add("proposed", () => {
	fullStringify(test_str)
})
.on("cycle", (event) => {
	console.log(String(event.target));
})
.run({"async": true})
