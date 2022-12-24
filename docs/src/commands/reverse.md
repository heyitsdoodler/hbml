# Reverse

The `hbml reverse` command allows you to convert HTML back into HBML.

The command accepts a list of paths, an optional output prefix, and a verbose output option.

It uses a HTML parser to tokenise the input which is then converted to HBML tokens and turned into linted HBML with the default linting options with one change to make elements with one child prefer the arrow operator over using brackets. 
