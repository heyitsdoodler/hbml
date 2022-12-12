# Introduction

Welcome to the HBML book! In this book we cover the entirety of HBML from simple files to complex macros and external dependencies

But to start, we need to introduce some useful terms we use:
- **Void elements** are HBML elements that can't have anything in it. For example, the `meta` tag is a void element
- The **arrow operator** is the `>` character. This is used after a tag, which can be empty
- A **child element** is any element that's nested inside another element called the **parent element**. For example in `div { h1 > "Example" }`, the `div` is the parent element and the `h1` is the child element in respect to each other
- **Implicit tags** are tags that are defined implicitly. For example `{ "Hello World!" }` is actually `div { "Hello World!" }` just that the `div` tag is implicit
