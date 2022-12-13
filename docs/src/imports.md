# Simple import files

HBML allows you to separate your projects into multiple files and import them later. We steal more syntax from CSS and use define importing files like this

```hbml
@import path/to/file
```

The path you give can optionally end in `.hbml`. If it does not, the builder will add it automatically for you. The path can also be a URL if you want to use an external macro library.

When you import a file, you only import the macros in the root of the file. These macros behave the same as if they were defined in the file you import them into. So, if you import a file with the macro `:example` in, you can use `:example` in your file just the same.

## Collisions

When you import macros, the builder will check for collisions, meaning macros with the same name. If it finds any, it'll give you an error. Otherwise, it adds the macros into the current scope. You can, however, redefine macros manually without raising an error. This has been done for two reasons:
1. When importing a file you're not immediately presented with every macro in it and you might accidentally overwrite a macro you needed by importing one with the same name. If you intend to do this, you can easily get rid of the error with namespaces
2. Macro importing can sometimes include useful macros that work most of the time but will occasionally need changing. We recommend this change be done manually to avoid an error and that you can use the macros the same without the need for namespaces

## Namespaces

When importing a file, you can optionally specify a namespace for all the macros in that file. If you do, any macro used from that file will need to be prefaced with the namespace of that file.

For example, if `a.hbml` contains `:example`, you could import it as `@import a namespace-a` and then use `:example` from `a.hbml` as `:namespace-a:example`.
