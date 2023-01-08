# Your first HBML file

To start off, let's make a file called `hello_world.hbml`. In this file we'll start off with a default template
```hbml
:root {
    head {
        title > "Hello from HBML!"
    }
    body {
        /* Your first HBML file */
        h1 > "Hello from a HBML file!"
    }
}
```

But what does this mean?

You may notice that the structure is pretty similar to a simple HTML file which is intentional. HBML is built on HTML with brackets not tags. In this sense, writing in HBML is functionally no different to writing in HTML, but hopefully a nicer experience.

But what are the `>` characters? If you have something with one element inside it, you can use the arrow operator. This is the same as putting the element after the arrow in brackets, but easier to read.

You'll also have noticed the comment line just before the `h1`. Comments in HBML are indicated by a starting `/*` and closing `*/` which can be on different lines. We discuss comments more when we talk about building HBML.

## IDs

An important part of HTML is tag IDs. In HBML we use the `#` character to indicate an ID. For example `h1#mainHeader` would be the same as `<h1 id="mainHeader">` in HTML.

IDs are placed after a tag type and are optional

## Classes

Classes are also a very important part of any webpage. In the style of CSS selectors, to specify a class on a tag we use the `.` character. For example `div.header` would be equivalent to `<div class="header">` in HTML.

Classes are placed after IDs and are optional

## Attributes

Tag attributes are placed inside square brackets and use the standard style. For example `meta[charset="UTF-8" someOtherAttribute]` would be the same as `<meta charset="UTF-8" someOtherAttribute/>` in HTML.

### Unique attributes

Any attribute can be a _unique attribute_. This means that if duplicates of the attribute are found, then the last one is used. If a duplicated attribute is not unique, then the values are placed together with a space separating them. For example, `lang` is a unique attribute so `html[lang="en" lang="de"]` would turn into `<html lang="de">`; but `class` is not a unique attribute so `p.lead[class="bold"]` or `p[class="bold" class="lead"]` would both become `<p class="lead bold">`.

You can override the default unique attributes by adding or removing attributes like this:
```hbml
/* Make the 'class' attribute unique */
:unique +class
/* Make the 'lang' attribute not unique */
:unique -lang
```

Attributes are placed after classes and are optional.

## Implicit tags

One of the large strengths of HBML is it's implicit tags. As the name suggests, these are implied tags and allow your code to look cleaner and be more readable.

Implicit tags are either `div`s or `span`s depending on the parent element type and default to `div`s. To give you an idea of how to use implicit tags, all of the following result in an implicit tag as the root tag:
- ` > "This text is under an implicit tag"`\
    Nothing before a curly bracket or arrow will create an implicit tag
- `#tagID { "An implicit tag with an ID" }`\
    Tag types are optional, but that doesn't mean you can't put an ID, classes, or attributes
- `.bold[href='some_page.html']`

## Strings

Strings in HBML can use one of three delimiters `'`, `"`, or <code>\`</code>. If you use the `'` or `"` delimiter, newlines won't be included in the resulting string, but using <code>\`</code> will include newlines.

Strings are also put through a substitution process to turn characters that might cause problems in HTML into their HTML codes such as `<` being replaced with <code>&amp;lt</code>
