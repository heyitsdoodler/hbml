# Parent macros

Parent macros are elements that perform code replacements with child elements. You might use this if you have a standard "block" made up of several nested elements so you could define a macro that expands to those elements then places something inside the elements.

If you want to make sure nothing is placed under the macro, you want to use a [child macro](child.md).

We define child macros as follows:
```hbml
--macro_name { macro_expansion }
```
For example `--header_text { "Header text" }` defines a macro called `header_text` that is replaced by `"Header text"`.

Parent macros also have access to the special macros `:children` and `:child` which are replaced by:
- `:children`
    All the remaining children not yet used
- `:child`
    The next child element passed to the macro, or nothing if there is no next element

As with all macros, we call then by prefacing the name with `:`. For example the `header_text` macro defined above would be called by `:header_text`.

## `:children` and `:child`

Using the example we gave at the start of a default block, this is a case you'd probably use `:children`. For example
```hbml
--block {
    .class1 {
        .class2 { :children }
    }
}
```

But, if your block requires a header, you might have the following
```hbml
--block {
    .class1 {
        .class2 {
            h1 > :child
            { :children }
        }
    }
}
```

this would take the first element given to the macro and place it under a `h1`, then all the other elements get placed under an implicit `div`. A call for this macro might look like the following
```hbml
:block {
    "Block header"
    ul {
        li > "Element 1"
        li > "Element 2"
    }
}
```

You can make child macros expand into larger things by placing an implicit tag after the arrow. For example `--example > { h1 > "Hello" h2 > "World" }`. If this implicit tag has an ID, classes, or attributes, then the tag is placed. otherwise the elements of the tag are placed.

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
