# 12 - An I/O Project: Building a Command Line Program

We know enough Rust now that we can actually write a useful program. We're going to make a copy of the Linux `grep` command. If you're a Windows user, or you're not much of a command-line person, the grep command basically works like this:

```sh
$ grep [pattern] [filename]
```

We run grep and give it a pattern and a filename. grep will read the file, and print out any lines that match the pattern.

We'll walk through building this project step-by-step, but if you're the sort of person who likes to read the last page of a book first, you can find the example for this project in [the GitHub repo for this book](https://github.com/jwalton/rust-book-abridged/blob/master/examples/ch12-minigrep).

We'll start this project, as we start all projects in this book, with cargo:

```sh
cargo new minigrep
cd minigrep
```

## 12.1 - Accepting Command Line Arguments

Let's kick things off with this quick skeleton of our app in _src/main.rs_:

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    let query = &args[1];
    let file_path = &args[2];

    println!("Searching for {}", query);
    println!("In file {}", file_path);
}
```

We want to call `std::env::args()` to get an iterator of command line arguments. We `use std::env` instead of `std::env::args`, because the convention in rust is to use the module for calling functions.

We'll gloss over iterators for now but we'll talk more about them in [chapter 13][chap13]. Right now what you need to know is that `env::args().collect()` is going to return a collection of all the command line arguments. We have to annotate `args` with the `Vec<String>` type, because `collect()` here is actually capable of returning different types of collections, and we specify which one we want by annotating the receiving variable!

We can run our program by running:

```sh
$ cargo run -- query file.txt
...
Searching for query
In file file.txt
```

Just like with `cargo test`, everything before the `--` is options for cargo itself, and everything afterwards gets passed through to our executable.

If you were to print out the contents of `args`, you'd find they contain something like `["target/debug/minigrep", "query", "file.tx"]`. The 0th command line argument is always the name of the executable being run (this is a convention used by many programming languages, and Rust uses it too). This is why we copy out the `query` and `file_path` from index 1 and 2, instead of from index 0 and 1.

Since we don't check the length of `args` here, if you try to run this with less than two command line arguments, it will panic. We'll add some error handling in a minute.

### The args Function and Invalid Unicode

One thing to note here; `env::args()` will panic if any of the arguments contain invalid unicode. If you're writing a program that needs to accept invalid unicode on the command line, check out `std::env::args_os()`.

## 12.2 - Reading a File

In order to read in a file, first we need a file. Create a file called _poem.txt_ in the root of your project (next to _cargo.toml_) and paste in this text from Emily Dickinson:

```txt
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

```rust
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

If we run this with `cargo run -- test poem.txt`, it should work. Let's split this up into multiple functions and handle some of these error cases correctly.

## 12.3 - Refactoring to Improve Modularity and Error Handling

### Separation of Concerns for Binary Projects

We've said this before, but the best way to organize a binary project is to have a binary crate and a library crate, and make the binary crate call into the library crate. If your command line parsing is fairly simple, it can be in the binary crate, but otherwise best practice is to move it into the library crate.

The binary crate should:

- Call the command line parsing logic.
- Set up any configuration (read config files, environment variables).
- Call a `run()` function in _lib.rs_ and handle any error that `run()` returns.

We want as much code as possible in the library crate. This does two things; first it makes it so a third party who wants to use our code could do so without having to call the binary, and second it's much easier to test code in a library crate. We try to keep the binary crate as small as possible so it's obvious that it is correct just from reading it.

### Extracting the Argument Parser

Let's move all the code for parsing arguments into _lib.rs_. First, we'll create a `Config` struct for holding our configuration. We'll also provide a constructor which builds the config from command line arguments:

```rust
pub struct Config {
    pub query: String,
    pub file_path: String,
}

impl Config {
    pub fn build(args: &[String]) -> Config {
        let query = args[1].clone();
        let file_path = args[2].clone();

        Config { query, file_path }
    }
}
```

Here we've defined `Config` in such a way that it owns the `query` and `file_path` strings. We can't directly take ownership of the strings in `args`, because we're only borrowing them. Here we're calling `clone()` to make copies of the strings.

Cloning the strings is slightly inefficient. In our case we know that `args` will stick around for the entire program, so we could probably use references to the strings in `args`, but there'd be some work to manage the lifetimes of the references. Since the length of the query and file_path are likely to be quite short, the tradeoff in efficiency is likely going to be small, so this is fine. We'll talk about how to deal with this situation a bit more in [chapter 13][chap13] when we talk about iterators.

You may have also noticed that all the constructors we've seen so far have been called `new()`, but we called ours `build()`. But `build()` isn't quite a normal constructor - if you were using this library in some other program where you were providing the arguments directly, you wouldn't want to call `Config::new()` and pass in an array of strings, where the first string is ignored. That's a weird interface. Also, by convention `new()` should never fail, and we're going to add some error handling to this function in just a moment.

### Fixing the Error Handling

Let's refine our constructor slightly to do some error handling:

```rust
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

We now return a `Result` so we can pass errors back to the caller. Our errors are simple `&'static str`. Since our errors are always constant strings, they'll have static lifetime.

Let's also take an opportunity to add a `run()` function to _lib.rs_:

```rust
use std::{error::Error, fs};

// --snip--

pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    println!("With text:\n{contents}");

    Ok(())
}
```

We're returning a `Result<(), Box<dyn Error>>`. As we saw before `Box<dyn Error>` lets us return any kind of error (and as before, we'll put off covering trait objects in detail until [chapter 17][chap17]). This lets us use the `?` operator when calling `fs:read_to_string()` to propagate any error it generates up the call stack.

Note at the end we're calling `Ok(())` to return the unit type wrapped inside a `Result`. We can't just not return anything, because then we'd implicitly be returning `()`, which doesn't match the declared `Result` type.

Back in _main.rs_ we'll have to update our code to handle creating the `Config` data structure and calling our `run()` function:

```rust
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

First notice that we need to `use minigrep::Config` to bring `Config` from the library crate into the binary crate. We don't do this for `run`, because the convention is to use structs directly and use the crate or module name for functions.

When we call into `Config::build()`, we're calling `unwrap_or_else()` to handle the error case. This function unwraps the `Ok` variant, "or else" calls into the provided closure, which we're using to print an error message and exit with an error code. (Again, we'll cover closures more in [chapter 13][chap13].) When calling `run()` we could also have used `unwrap_or_else()`, but `run()` doesn't return a value we want to unwrap, so instead we use the `if let...` syntax.

Finally, a subtle change but we're using `println!()` here instead of `println!()`. This causes our errors to be printed to stderr instead of stdout. If you try running:

```sh
$ cargo run > output.txt
Problem parsing arguments: not enough arguments
```

you should see the error in the terminal, instead of it being sent to `output.txt`.

## 12.4 Developing the Library's Functionality with Test-Driven Development

Since this is the abridged version of this book, we'll skip defining test-driven development, and jump right into writing some tests.

We want a test that makes sure, when we provide some file content and a query, we get back the correct output. To do this, we're going to create a function called `search()` in _lib.rs_, and add a test case for it:

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    // TODO: Do the thing!
    vec![]
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

This calls our search function with a query and some text from a hypothetical file, and makes sure the result contains the only line that contains `duct`. The only thing we haven't seen before is the multi-line string starting with `"\`. Also, notice the lifetime annotations on `search`. We're telling Rust that the return value of `search` is only valid for as long as the `contents` passed in are valid.

To actually implement our search function, we need to split the contents into lines, iterate over the lines, and add each line that matches into our result. We'll store the results in a vector and return it (passing ownership back up to the parent):

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}
```

If we run our tests, we'll see they pass.

### Using the search Function in the run Function

The final piece here is to call into our `search()` function from `run()`:

```rust
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

We'll add a feature to minigrep to allow it to do case-insensitive matches if the `IGNORE_CASE` environment variable is set. Why an environment variable instead of a command line switch like `-i`? Mainly because we want to demonstrate the use of environment variables.

We'll start this out by defining a new function called `search_case_insensitive()` in _src/lib.rs_:

```rust
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

This looks a lot like `search()` with a few `to_lowercase` added in to handle case sensitivity. Note that `query` is now a `String` instead of a string slice, because `to_lowercase` creates a copy of the string when modifying it. It's worth noting here that `to_lowercase` will handle some basic Unicode - certainly anything in English - but it's not perfect, so if you were implementing this for real you'd probably pull in a crate to handle this.

No function is complete without a matching test:

```rust
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

We'll also update our `Config` struct, and update `run()` to call our new function:

```rust
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

And now we get to the good bit - inside `Config::build()` we'll check the environment variable and set our new `ignore_case` flag:

```rust
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
