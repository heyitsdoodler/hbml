# CLI Usage

## Install

```shell
npm install -g hbml
```

## Commands

```shell
hbml [command]
```

All commands including `hbml` can have the `-h` or `--help` flags passed to print help information.

The `hbml` command also accepts the `-V` or `--version` flag which will result in version information being printed. It also accepts the `help` command as an alias for `hbml -h`.

### Build

```shell
hbml build [source]... [-o path] [-s=skip_opt]
```

This takes in paths to directories or files and build the hbml files into html files. If a directory if given as part of the specified source paths, every hbml file under that directory is built. If no source files are given, the current working directory is used. The `-o` flag is used to specify file output path and defaults to the current working directory.

The `-s` flag is for skipping errors. The available values for this are:

| Value       | Description                                                 |
|-------------|-------------------------------------------------------------|
| `not_found` | Will skip over file not found errors with a warning         |
| `write`     | Will skip over errors in writing output html with a warning |

The final output of any file is `$PWD/<output prefix path>/<source file path>` if the given file is relative, otherwise it will write to `<source file path>/<source file name>.html`

### Lint

```shell
hbml lint [source]... [-c file] [-o path] [-p]
```

Lints all specified files. Source files are specified the same way as for the [`build`](#build) command with the same assumptions if none are given.

The `-c` flag is for specifying a config file to use (see the [config section](#config)). If none is given, it will look for a `hbml.json` file in the current directory for config. If this is not found, it will assume the default configuration specified in the [config section](#config).

The `-o` flag is to specify a custom output instead of overwriting the existing files. The `-p` flag is equivalent to `-o linted` but takes lower precedent i.e. if both `-o` and `-p` are specified where `-o` has a usable value, the given value is used insteadof `linted`. Specifying both flags will result in a warning being emitted.

## Config
