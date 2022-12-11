# Child macros

Child macros are **void elements** that perform simple replacements. You might use this for defining all the text to be used on a page as macros, then as your develop the actual HBML of the page, you can move text around by moving one macro instead of a block of text.

If you need your macro to have elements under it, you need a [parent macro](parent.md).

We define child macros as follows:
```hbml
--macro_name > macro_expansion
```
For example `--header_text > "Header text"` defines a macro called `header_text` that is replaced by `"Header text"`.

As with all macros, we call then by prefacing the name with `:`. For example the `header_text` macro defined above would be called by `:header_text`.

You can make child macros expand into larger things by placing an implicit tag after the arrow. For example `--example > { h1 > "Hello" h2 > "World" }`. If this implicit tag has an ID, classes, or attributes, then the tag is placed. otherwise the elements of the tag are placed.

## Attributes

Child macros can have default attributes, classes, and an ID. For each of these, we consider the following:
- If an ID is specified with the macro call, this replaces the default ID
- If a class is specified with the macro call, this is added to the default classes
- If an attribute is specified with the macro call, the attribute value is either replaced or added to depending on if the attribute is a unique attribute

## Examples

The following examples give equivalent code blocks seperated by a comment

This example gives a simple child macro
```hbml
/* Macro */
--example1 > "Hello"
:example1

/* Equivalent */
"Hello"
```

This example shows how to make your macro bigger
```hbml
/* Macro */
--example2 > {
    h1 > "Hello"
    h2 > "World"
}
:example2

/* Equivalent */
h1 > "Hello"
h2 > "World"
```

This example shows how to make child macros expand into implicit tags with no attributes, ID, or classes
```hbml
/* Macro */
--example3 > {{
    h1 > "Hello"
    h2 > "World"
}}
:example3

/* Equivalent */
{
    h1 > "Hello"
    h2 > "World"
}
```

This example shows how adding a class (or ID or attribute) to the first implicit tag stops changes the macro behaviour
```hbml
/* Macro */
--example4 > .headImplicit {
    h1 > "Hello"
    h2 > "World"
}
:example4

/* Equivalent */
.headImplicit {
    h1 > "Hello"
    h2 > "World"
}
```
