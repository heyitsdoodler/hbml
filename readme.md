# HBML: Hyper Braced Markup Language

This is a Javascript module that contains a toy parser I made for fun.

I wasn't intending on putting this on GitHub since it's definitely not efficient or well written, but some people were curious and so no harm no foul.

But just keep in mind that this is very much a toy, and invalid syntax will just cause the parser to spit out broken HTML.

[Try version of parser on my website](https://aydenh.ca/hbml/)

## Premise

Make HTML a little more concise and use syntax that is more similar to CSS and Javascript.

## Syntax

The root element of every HBML document is ':root' which becomes 'html[lang="en"]' when converted to html

The syntax for defining an element is similar to how you would write a CSS selector.

1. Enter the name of the element.
    - The name may be omitted in favour of only defining ids, classes, and attributes
    - This will cause the element to default to be a div (or span when a child of an inline element).

2. Ids and classes can be appended to the end of the element name with '#*id*' and '.*class*' respectively.
    - As many classes and ids can be appended to an element as needed.

3. Attributes can be added inside square brackets [] appended to the element name.

    - The last set of attributes appended to an element will be the only one that takes effect.
    - This behaviour allows removing or overwriting the language property of ':root', ':root[]' to remove, ':root[lang="en_CA"]' to overwrite.

4. After the element a pair of braces {} can be added to define the contents of the element, these are not required if the element is empty or is void.

5. Inside the braces child elements may be added, text nodes may be added ("Hello, World!"), and multiline comments may be added (/* comment */).

Example empty section element with id of "wrapper"
```hbml
section.wrapper
```

Example p element with inline style
```hbml
p[style="color: red;"] {"Hello, World!"}
```

Example implicit div element with multiple classes
```hbml
.class-one.class-two.class-three {
    "Text inside an implicit div"
}
```

## HTML vs HBML examples
### Classes, Ids, and Attributes
HTML
```html
<p id="myParagraph" class="paraClass1 paraClass2">Paragraph Text</p>
<input type="text">
```
HBML
```hbml
p#myParagraph.paraClass1.paraClass2 {
    "Paragraph Text"
}
input[type="text"]
```
### Default divs and spans
HTML
```html
<!-- I made divs (or spans inside default inline elements) the default if nothing is specified -->
<div>Some text</div>
<span>
    <span>This part is automatically a span because of the parent</span>
</span>
```
HBML
```hbml
/* I made divs (or spans inside default inline elements) the default if nothing is specified */
{"Some text"}
span {
    {"This part is automatically a span because of the parent"}
}
```
### Whole page
HTML
```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Title of webpage</title>
        <style>
            body {
                font-family: sans-serif;
            }
        </style>
    </head>
    <body>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <h5>Heading 5</h5>
        <h6>Heading 6</h6>
        <div>
            <p>A paragraph inside a div</p>
        </div>
        <a href="./">Clickable link</a>
    </body>
</html>
```
HBML
```hbml
:root {
    head {
        meta[charset="UTF-8"]
        meta[name="viewport" content="width=device-width, initial-scale=1"]
        title { "Title of webpage" }
        style { "
            body {
                font-family: sans-serif;
            }
        " }
    }
    body {
        h1 { "Heading 1" }
        h2 { "Heading 2" }
        h3 { "Heading 3" }
        h4 { "Heading 4" }
        h5 { "Heading 5" }
        h6 { "Heading 6" }

        div {
            p { "A paragraph inside a div" }
        }

        a[href="./"] { "Clickable link" }
    }
}
```
