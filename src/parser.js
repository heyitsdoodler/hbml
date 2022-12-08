/*
This is a toy parser for converting HBML to HTML

This is a bit of hot js garbage but whatever
 */

/* Elements that are not allowed to have contents */
const VOID_ELEMENTS = [
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
]
/* Elements that cause their children to become spans instead of divs when no element is specified */
const INLINE_ELEMENTS = [
    "abbr",
    "acronym",
    "audio",
    "b",
    "bdi",
    "bdo",
    "big",
    "br",
    "button",
    "canvas",
    "cite",
    "code",
    "data",
    "datalist",
    "del",
    "dfn",
    "em",
    "embed",
    "i",
    "iframe",
    "img",
    "input",
    "ins",
    "kbd",
    "label",
    "map",
    "mark",
    "meter",
    "noscript",
    "object",
    "output",
    "picture",
    "progress",
    "q",
    "ruby",
    "s",
    "samp",
    "script",
    "select",
    "slot",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "svg",
    "template",
    "textarea",
    "time",
    "u",
    "tt",
    "var",
    "video",
    "wbr"
]

const validQuotes = /["'`]/

/*
Used as a root element that everything is wrapped in
 */
const TRUE_ROOT = "__hbml_true_root__"

const createIterString = (string) => {
    let index = 0

    return {
        hasNext: () => index < string.length,
        next: () => {
            return string[index++]
        },
        back: () => {
            index--
        },
        peek: (num = 0) => {
            return string[index + num]
        }
    }
}

// Convert reserved HTML characters to their corresponding entities
const convertReservedChar = (string) => {
    const reserved = {
        //"\"": "&quot;", // Caused problems with style tag

        "&": "&amp;", // Has to be done first, for reasons
        // "'":"&apos;",
        "<": "&lt;",
        ">": "&gt;",
    }


    for (const property in reserved)
        string = string.replaceAll(property, reserved[property])

    return string
}

// Parse multiline comment
const parseComment = (iter) => {
    let outputComment = ""

    let done = false

    while (iter.hasNext() && !done) {
        const next = iter.next()

        if (next === "*" && iter.peek() === "/") {
            done = true
            iter.next()
        }
        else {
            outputComment += next
        }
    }

    return `<!-- ${outputComment.trim()} -->`
}

// Parse double quote string
const parseStr = (iter, char = "\"", convert = true) => {
    let outputStr = ""

    let escape = false
    let done = false

    while (iter.hasNext() && !done) {
        const next = iter.next()

        if (next === "\\" && !escape) escape = true
        else if (next === char && !escape) done = true
        else {
            if (escape && next !== char) outputStr += "\\"
            escape = false
            outputStr += next//.replace("\"", "quot;")
        }
    }

    if (char !== "`") outputStr = outputStr.replaceAll("\n", "")

    return convert ? convertReservedChar(outputStr) : outputStr
}

// Parse out the tagName, classes, ids, and attributes from an HBML element
const parseSelector = (selector, inline = false) => {
    // I thought it would be weird to use "html" in hbml. I use ":root" instead
    // It defaults :root to become html with an en lang tag but this can be overwritten with :root[lang="something else"]
    const iter = createIterString(selector.trim().replace(/^:root/, "html[lang=\"en\"]"))

    let htmlTag = ""
    let ids = []
    let classes = []

    let attributes = {}

    let pieces = []
    let index = 0

    let insideAttributes = false

    while (iter.hasNext()) {
        const next = iter.next()

        if (insideAttributes) {
            if (next === "]")  {
                insideAttributes = false
            }
        } else if (next.match(/[#.\[]/)) {
            index++
            if (next === "[")  {
                insideAttributes = true
            }
        }

        if (!pieces[index]) pieces[index] = ""

        pieces[index] += next
    }

    pieces.forEach(piece => {
        if (piece.length > 0)
            switch (piece[0]) {
                case "#":
                    ids.push(piece.slice(1))
                    break
                case ".":
                    classes.push(piece.slice(1))
                    break
                case "[":
                    const attrIter = createIterString(piece.slice(1, -1))
                    attributes = {}

                    let attribute = ""

                    const addAttribute = (next) => {
                        if (attribute.length) {
                            const peek = attrIter.peek()

                            if (!next || next.match(/\s/)) {
                                attributes[attribute] = true
                            }
                            else if (next === "=") {
                                if (peek?.match(validQuotes)) {
                                    const char = attrIter.next()
                                    attributes[attribute] = parseStr(attrIter, char, false)
                                } else {
                                    attributes[attribute] = parseStr(attrIter, " ", false)
                                }
                            }
                            attribute = ""
                        }
                    }

                    while (attrIter.hasNext()) {
                        const next = attrIter.next()

                        if (next.match(/[\s=]/)) addAttribute(next)
                        else attribute += next
                    }
                    addAttribute()

                    break
                default:
                    htmlTag = piece
                    break
            }
    })

    const joinedIds = Array.from(new Set(ids)).join(" ").trim()
    const joinedClasses = Array.from(new Set(classes)).join(" ").trim()

    return {
        tag: htmlTag.trim() ? htmlTag.trim() : (!inline ? "div" : "span"),
        attributes: (`${joinedIds.length ? `id="${joinedIds}" ` : ""}${joinedClasses.length ? `class="${joinedClasses}" ` : ""}${Object.entries(attributes).map(d => `${d[0]}${d[1] !== true ?`="${d[1].replaceAll("\"", "&quot;")}"` : ""}`).join(" ")}`
            .trim())
    }
}

// Parse the next child of an element, whether it be string, comment, or another element
const parseElChild = (iter, parentTag = "") => {
    const next = iter.next()

    if (next.match(validQuotes)) return parseStr(iter, next)
    else if (next === "/" && iter.peek() === "*") {
        iter.next()
        return parseComment(iter)
    }
    // else if (next === "@") return parseImport()
    else {
        iter.back()
        return parseEl(iter, parentTag)
    }
}

// Parse HBML element
const parseEl = (iter, parentTag = "") => {
    let unparsedSelector = ""
    let childrenOutputs = []

    let mode = 0

    let multiline = false
    let inSquares = false

    while (iter.hasNext() && mode <= 1) {
        const next = iter.next()

        switch (mode) {
            case 0:
                if (next === ">" && !inSquares) mode = 1
                else if (next === "{") {
                    mode = 1
                    multiline = true
                }
                else if (next === "\n" && !inSquares) {
                    mode = 2
                }
                else if (next.match(validQuotes) && !inSquares) {
                    iter.back()
                    mode = 2
                }
                else if (next.match(/[\s}]/) && !inSquares) {
                    if (iter.peek() !== "{" && iter.peek() !== ">") mode = 2
                }
                else {
                    if (next === "[") inSquares = true
                    else if (next === "]") inSquares = false
                    unparsedSelector += next
                }
                break
            case 1:
                const {tag} = parseSelector(unparsedSelector, INLINE_ELEMENTS.includes(parentTag.toLowerCase()))

                if ((childrenOutputs.length > 0 || next === "\n") && !multiline) {
                    iter.back() // So the parent can capture the space again
                    mode = 2
                }
                else if (next === "}" && multiline) {
                    mode = 2
                }
                else if (!next.match(/\s/)) {
                    // Void elements are not allowed to have children
                    if (!VOID_ELEMENTS.includes(tag.toLowerCase())) {
                        iter.back()
                        if (multiline) {
                            childrenOutputs[childrenOutputs.length] = parseElChild(iter, tag)
                        } else {
                            childrenOutputs = [parseElChild(iter, tag)]
                        }
                    }
                    else childrenOutputs = [`<!-- Void element ${tag} may not have child nodes -->`]
                }

                break
        }
    }

    const {tag, attributes} = parseSelector(unparsedSelector, INLINE_ELEMENTS.includes(parentTag.toLowerCase()))

    // Add closing tag for non-void elements
    const closingTag = !VOID_ELEMENTS.includes(tag.toLowerCase())

    return (
        `${tag.toLowerCase() === "html" ? `<!doctype html>` : ""}<${tag}${attributes ? ` ${attributes}` : ""}${!closingTag ? `/` : ""}>${childrenOutputs.join("")}${closingTag ? `</${tag}>` : ""}`
    )
}

export const parseHBML = (hbml) => {
    // The input is wrapped in the "TRUE_ROOT" you can have multiple top level components, such as comments
    const parsed = `${parseEl(createIterString(`${TRUE_ROOT}{${hbml.trim()}}`))}`

    // The "TRUE_ROOT" is stripped out of the final HTML output
    return parsed.substring(TRUE_ROOT.length+2, parsed.length-(TRUE_ROOT.length+3))
}