# Projects

Very rarely will you be working with single HBML files in isolation. It's much more common for you to be using them in a project with multiple HBML files.

Because of this, you can use HBML alongside a project just like normal.

To do this, run `hbml init` in the project directory. This will create a `hbml.json` file with the default value below

```json
{
  "build": {
    "src": ["."],
    "output": "html"
  },
  "lint": {
    "src": ["."],
    "output": "html"
  }
}
```
