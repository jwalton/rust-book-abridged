# 12 - An I/O Project: Building a Command Line Program

We know enough Rust now that we can actually write a useful program. We're going to make a copy of the Linux `grep` command. If you're a Windows user, or you're not much of a command-line person, the grep command basically works like this:

```sh
$ grep [pattern] [filename]
```

We run `grep` and give it a pattern and a filename. `grep` will read the file, and print out any lines that match the pattern. We'll walk through building this project step-by-step, but if you're the sort of person who likes to read the last page of a book first, you can find the example for this project in [the GitHub repo for this book](https://github.com/jwalton/rust-book-abridged/blob/master/examples/ch12-minigrep).

## 12.1 - Accepting Command Line Arguments

We'll start this project, as we start all projects in this book, with cargo:

```sh
cargo new minigrep
cd minigrep
```

And we'll kick things off with this quick skeleton of our app in _src/main.rs_:

```rust title="src/main.rs"
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    // &args[0] is the name of the binary
    // e.g. target/debug/minigrep
    let query = &args[1];
    let file_path = &args[2];

    println!("Searching for {}", query);
    println!("In file {}", file_path);
}
```

We call `env::args()` to get an iterator of command line arguments. We `use std::env` instead of `use std::env::args`, because the convention in rust is to include the name of the the module when calling functions.

`args` returns an iterator, which we're going to gloss over a bit for now (see [chapter 13][chap13]). Right now what you need to know is that `env::args().collect()` is going to return a collection of all the command line arguments. We have to annotate `args` with the `Vec<String>` type, because `collect` here is actually capable of returning different types of collections, and we specify which one we want by annotating the receiving variable! As is standard in most languages, the zeroth `arg` is the name of the executable so we skip it.

:::tip
We could also tell `collect` what type to return with the _turbofish_ operator: `::<>`:

```rust
let args = env::args().collect::<Vec<String>>();
```

We can _also_ use this syntax to get Rust to infer the generic type of the vector for us:

```rust
let args: Vec<_> = env::args().collect();
```

:::

We can run our program by running:

```sh
$ cargo run -- query file.txt
...
Searching for query
In file file.txt
```

Just like with `cargo test`, everything before the `--` is options for cargo itself, and everything afterwards gets passed through to our executable.

Since we don't check the length of `args` here, if you try to run this with less than two command line arguments, it will panic. We'll add some error handling in a minute.

:::info
`env::args()` will also panic if any of the arguments contain invalid unicode. If you find yourself writing a program that needs to accept invalid unicode on the command line, check out `std::env::args_os()`.
:::

## 12.2 - Reading a File

In order to read in a file, first we need a file. Create a file called _poem.txt_ in the root of your project (next to _Cargo.toml_) and paste in this text from Emily Dickinson:

```txt title="poem.txt"
I'm nobody! Who are you?
Are you nobody, too?
Then there's a pair of us - don't tell!
They'd banish us, you know.

How dreary to be somebody!
How public, like a frog
To tell your name the livelong day
To an admiring bog!
```

Then we can add some code to read the file:

```rust title="src/main.rs"
use std::env;
use std::fs;

fn main() {
    // --snip--
    println!("In file {}", file_path);

    let contents = fs::read_to_string(file_path)
        .expect("Should have been able to read the file");

    println!("With text:\n{contents}");
}
```

If we run this with `cargo run -- test poem.txt`, it should print out the contents of the poem. Let's split this up into multiple functions and handle some of these error cases correctly.

## 12.3 - Refactoring to Improve Modularity and Error Handling

### Separation of Concerns for Binary Projects

We've said this before, but the best way to organize an application is to have a binary crate and a library crate, and make the binary crate call into the library crate. We want as much code as possible in the library crate. This does two things; first it makes it so a third party who wants to use our code could do so without having to call the binary, and second it's much easier to test code in a library crate. We try to keep the binary crate as small as possible so it's obvious that it is correct just from reading it.

Our binary crate will:

- Call the command line parsing logic.
- Set up any configuration (read config files, environment variables).
- Call a `run` function in _lib.rs_ and handle any error that `run` returns.

### Extracting the Argument Parser

Let's move all the code for parsing arguments into _src/lib.rs_. First, we'll create a `Config` struct for holding our configuration. We'll also provide a constructor which builds the config from command line arguments:

```rust title="src/lib.rs"
pub struct Config {
    pub query: String,
    pub file_path: String,
}

impl Config {
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        let query = args[1].clone();
        let file_path = args[2].clone();

        Ok(Config { query, file_path })
    }
}
```

Here we've defined `Config` in such a way that it owns the `query` and `file_path` strings. We can't directly take ownership of the strings in `args`, because the slice passed in owns them and we're only borrowing the slice. To fix this we're calling `clone` to make copies of the strings.

Cloning the strings is slightly inefficient. In our case we know that `args` will stick around for the entire program, so we could probably use references to the strings in `args`, but there'd be some work to manage the lifetimes of the references. Since the length of the `query` and `file_path` are likely to be quite short, the tradeoff in efficiency is likely going to be small, so this is fine. We'll talk about a better way to handle this situation a bit more in [chapter 13][chap13] (hint: we could pass in the iterator itself instead of the result of `collect`).

You may have also noticed that all the constructors we've seen so far have been called `new`, but we called ours `build`. This is because `build` isn't quite a normal constructor. First, by convention the `new` constructor should not be allowed to fail. Second, if you were using this library in some other program where you were providing the arguments directly, you wouldn't want to call `Config::new` and pass in an array of strings, where the first string is ignored. That's a weird interface.

Speaking of failures, our `build` function returns a `Result<T, E>` so we can pass errors back to the caller. Since our errors are always constant strings, they'll have static lifetime, so our `E` is `&'static str`.

Let's also add a `run` function to _src/lib.rs_:

```rust title="src/lib.rs"
use std::{error::Error, fs};

// --snip--

pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    // TODO: Implement me!

    Ok(())
}
```

We're returning a `Result<(), Box<dyn Error>>`. As we saw before `Box<dyn Error>` lets us return any kind of error (and as before, we'll put off covering trait objects until [chapter 17][chap17]). Returning a `Result` lets us use the `?` operator when calling `fs:read_to_string` to propagate any error it generates up the call stack. Note at the end we're calling `Ok(())` to return the unit type wrapped inside a `Result`. We can't just not return anything, because then we'd implicitly be returning `()`, which doesn't match the declared `Result` type.

Back in _src/main.rs_ we'll have to update our code to handle creating the `Config` data structure and calling our `run` function:

```rust title="src/main.rs"
use minigrep::Config;
use std::{env, process};

fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    if let Err(e) = minigrep::run(config) {
        eprintln!("Application error: {e}");
        process::exit(1);
    }
}
```

First notice that we need to `use minigrep::Config` to bring `Config` from the library crate into the binary crate. We don't do this for `run`, because the convention is to use structs directly and use the crate or module name for functions. (If you're wondering why we don't have to `use minigrep`, it's because `minigrep` is a fully qualified top level path like `std`.)

When we call into `Config::build`, we're calling `unwrap_or_else` to handle the error case. This function unwraps the `Ok` variant, "or else" calls into the provided closure (see [chapter 13][chap13]), which we're using to print an error message and exit with an error code. When calling `run` we could also have used `unwrap_or_else`, but `run` doesn't return a value we want to unwrap, so instead we use the `if let...` syntax.

Finally, note the subtle change from our usual `println!` macro. We're using `eprintln!` here instead, which causes our errors to be printed to stderr instead of stdout. If you try running:

```sh
$ cargo run > output.txt
Problem parsing arguments: not enough arguments
```

you should see the error in the terminal, instead of it being sent to `output.txt`.

## 12.4 Developing the Library's Functionality

We're going to create a function called `search` that takes a query and the contents of a file, and returns all the matching lines. We're also going to write a test case for this function:

```rust title="src/lib.rs"
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_result() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }
}
```

The `one_result` test calls our search function with a query and some text from a fake file, and makes sure the result contains the only line that contains `duct`. The only thing we haven't seen before is the multi-line string starting with `"\`.

In the implementation of our search function, we need to split the contents into lines, iterate over the lines, and add each line that matches into our result. We store the results in a vector and return it (passing ownership back up to the parent). Notice the lifetime annotations on `search`. We're telling Rust that the references in the returned vector are only valid for as long as the `contents` string passed in is valid.

### Using the `search` Function in the `run` Function

The final piece here is to call into our `search` function from `run`:

```rust title="src/lib.rs"
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    for line in search(&config.query, &contents) {
        println!("{line}");
    }

    Ok(())
}
```

We can now try `cargo run -- frog poem.txt` and it should print out the single line that contains "frog", or `cargo run -- body poem.txt` should print three lines.

## 12.5 - Working with Environment Variables

We'll add a feature to minigrep to allow it to do case-insensitive matches if the `IGNORE_CASE` environment variable is set. Why an environment variable instead of a command line switch like `-i`? Because this section is about environment variables.

We'll start this out by defining a new function called `search_case_insensitive` in _src/lib.rs_:

```rust title="src/lib.rs"
// --snip--

pub fn search_case_insensitive<'a>(
    query: &str,
    contents: &'a str,
) -> Vec<&'a str> {
    let query = query.to_lowercase();
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.to_lowercase().contains(&query) {
            results.push(line);
        }
    }

    results
}
```

This looks a lot like `search` with a few `to_lowercase` added in to handle case sensitivity. Note that `to_lowercase` returns a copy of the string rather than editing the original, so after the first line of this function `query` is a `String` instead of a `&str`. It's worth noting here that `to_lowercase` will handle some basic Unicode - certainly anything in English - but it's not perfect, so if you were implementing this for real you'd probably pull in a crate to handle this.

No function is complete without a matching test:

```rust title="src/lib.rs"
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        // --snip--
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, contents)
        );
    }
}
```

We'll also update our `Config` struct, and update `run` to call our new function:

```rust title="src/lib.rs"
pub struct Config {
    pub query: String,
    pub file_path: String,
    pub ignore_case: bool,
}

// --snip--

pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    for line in results {
        println!("{line}");
    }

    Ok(())
}
```

And now we get to the good bit - inside `Config::build` we'll check the environment variable and set our new `ignore_case` flag:

```rust title="src/lib.rs"
use std::{error::Error, fs, env};

// --snip--

impl Config {
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        let query = args[1].clone();
        let file_path = args[2].clone();

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
```

You can now give this a try. On Windows, it will be:

```powershell
PS> $Env:IGNORE_CASE=1
PS> cargo run -- to poem.txt
PS> Remove-Item Env:IGNORE_CASE
```

On Mac or Linux, you can use:

```sh
$ IGNORE_CASE=1 cargo run -- to poem.txt
```

Continue to [chapter 13][chap13].

[chap13]: ./ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
