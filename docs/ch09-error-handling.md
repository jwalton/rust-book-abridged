# 9 - Error Handling

> Rust has a tiered error-handling scheme:
>
> - If something might reasonably be absent, Option is used.
> - If something goes wrong and can reasonably be handled, Result is used.
> - If something goes wrong and cannot reasonably be handled, the thread panics.
> - If something catastrophic happens, the program aborts.

-- [The Rustonomicon, Chapter 7: Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html)

## 9.1 - Unrecoverable Errors with `panic!`

We've already discussed a few times when your program will _panic_: when you try to index an array or vector out-of-bounds, or when you call `expect()` on an `Option::None`, for example.

You can also force your program to panic with the `panic!` macro:

```rust
fn main() {
    panic!("crash and burn");
}
```

When a panic occurs in the main thread, it halts the program. If the `RUST_BACKTRACE=1` environment variable is set, then the program will also print a stack trace showing where the panic happened, although this only works if the binary contains debug symbols. (If a panic occurs in another thread, it will only halt that thread. See [chapter 16][chap16].)

### Unwinding the Stack or Aborting in Response to a Panic

There are two options for what happens when a panic occurs. By default, the program starts _unwinding_, which means it starts walking back up the stack, freeing memory and cleaning up data. The alternative is _aborting_ in which the program just immediately halts and lets the OS clean up everything (if you've ever written a C program, you've probably at some point seen the dreaded message "segmentation fault (core dumped)" - aborting is a bit like this).

You can switch to using the abort behavior by adding `panic = 'abort'` to your Cargo.toml file:

```toml
[profile.release]
panic = 'abort'
```

Aborting has the advantage that we don't need all the code for unwinding, so our compiled binary will be smaller. In many cases aborting will be faster than unwinding too. If you want to know more about the differences between aborting an unwinding, [see the Rustonomicon](https://doc.rust-lang.org/nomicon/unwinding.html).

## 9.2 - Recoverable Errors with Result

Many errors can be recovered from. You try to read a file and it doesn't exist, a socket closes unexpectedly, these are not the sorts of things where you typically want to panic. In languages like JavaScript, Java, C++, or Python, these sort os errors are represented as exceptions. In languages like C or Go, errors are explicitly returned from a function.

Rust takes this second approach with the `Result` enum. Result is similar to the [`Option` enum](./ch06-enums-and-pattern-matching.md#the-option-enum-and-its-advantages-over-null-values), but instead of being `Some` or `None`, its variants are `Ok` and `Err`:

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Much like `Option`, `Result` and its two variants are in the prelude, so there's no need to `use` them. Result is generic over both the type of result it returns, and the type of error.

Let's see a quick example:

```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file_obj) => file_obj,
        Err(error) => panic!("Problem opening the file: {:?}", error),
    };
}
```

If opening the file is successful, we'll fall into the first arm of the `match`, and `file_obj` will be a [`File`](https://doc.rust-lang.org/std/fs/struct.File.html). If the file doesn't exist or some other error happens, then `error` will be a [`std::io::Error`](https://doc.rust-lang.org/std/io/struct.Error.html).

### Matching on Different Errors

In the previous example, we just panic if an error happens opening the file. But there are different reasons why this might error; the file might not exist, we might not have permission to read it, the network might be down. Let's suppose we want to handle the case where the file doesn't exist by creating the file, and in any other case we'll panic:

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("Problem creating the file: {:?}", e),
            },
            other_error => {
                panic!("Problem opening the file: {:?}", other_error);
            }
        },
    };
}
```

In the `Err` arm, we're calling `error.kind()` to find out what kind of error this is. This returns a `std::io::ErrorKind`, which is an enum of all the various reasons an `io` operation might fail. We match on the kind, and if it is `ErrorKind::NotFound` we'll try to create the file (which might also fail, so we'll have to deal with that error too!)

If you're a JavaScript programmer who remembers the days before async and await, you might be looking at some of these examples and having flashbacks to the "pyramid of doom" frequently caused by many deeply nested callbacks. Don't worry just yet - we're going to explore some ways to make that code a little less verbose in the rest of this chapter.

### Alternatives to Using match with `Result<T, E>`

That last example had a lot of `match` statements! Fortunately `Result` has many methods defined on it which can be used to write more concise versions of the code above. Here's a quick example using the `unwrap_or_else()` method:

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let greeting_file = File::open("hello.txt").unwrap_or_else(|error| {
        if error.kind() == ErrorKind::NotFound {
            File::create("hello.txt").unwrap_or_else(|error| {
                panic!("Problem creating the file: {:?}", error);
            })
        } else {
            panic!("Problem opening the file: {:?}", error);
        }
    });
}
```

This introduces a new concept called _closures_ which we'll talk more about in [chapter 13][chap13], but if languages you've used have arrow functions or lambdas, you can probably figure out what's going on in this example. (Hint: the `|error| { ... }` creates a function that takes an error as a parameter, similar to an `(err) => {...}` in JavaScript.) If you're having trouble with this example, don't worry - bookmark this and come back to it after you've read chapter 13.

### Shortcuts for Panic on Error: `unwrap` and `expect`

When we were learning about [the `Option` enum](./ch06-enums-and-pattern-matching.md#the-option-enum-and-its-advantages-over-null-values), we learned about the `unwrap()` and `expect(message)` methods which panic if the Option is `None`. `Result` has `unwrap()` and `expect()` methods that work similarly, causing a panic if the `Result` is an `Err` variant:

```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt").unwrap();

    let greeting_file2 = File::open("goodbye.txt")
        .expect("goodbye.txt should have been installed");
}
```

`expect()` is generally preferred over `unwrap()`, as it gives more information about what went wrong and the assumptions that were made for not dealing with this error.

### Propagating Errors

Often if an error occurs in a function, we don't want to handle the error ourselves but propagate the error to the function's caller. If you're coming to Rust from Go, you've no doubt written `if err != nil { return err }` many times in your career.

Here's a very verbose example of a function that reads a username from a file. If the file can't be read, we don't want `read_username_from_file()` to panic, but we also don't know how to handle the error here. We want to return the error back to the caller so the caller can decide what to do about the fact that we can't find the username:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let username_file_result = File::open("hello.txt");

    let mut username_file = match username_file_result {
        Ok(file) => file,
        Err(e) => return Err(e),
    };

    let mut username = String::new();

    match username_file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}
```

One important thing to note here is that `read_username_from_file()` returns a `Result<String, io:Error>`. We chose `io:Error` for the `E` part of `Result<T, E>`, because this is the error type that both of the functions we call can return. We can use a shortcut called the `?` operator to reduce a lot of this boilerplate:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username_file = File::open("hello.txt")?;
    let mut username = String::new();
    username_file.read_to_string(&mut username)?;
    Ok(username)
}
```

The `?` operator can be placed after any `Result`, and basically is the same as the `match` expression from the original example. The `?` says: "If `result` is an `Ok` variant, resolve this expression to the value of the `Ok`. If `result` is an `Err` then `return result`".

This works here because the `Result`s we're adding `?` to and our `read_username_from_file()` both return a Result with the same error type, but they don't have to! The `?` operator will pass errors through the `from()` function from the `From` trait on our return type to convert the error from one error type to another.

For example, if we wanted to defined a custom error type named `OurError`, we could define `impl From<io::Error> for OurError` to tell Rust how to convert `io:Error`s to `OurError`s, without needing to add any more code to our example.

We can shorten this method further by eliminating some variable names and using chaining:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("hello.txt")?.read_to_string(&mut username)?;
    Ok(username)
}
```

But of course reading a file to a string is a fairly common operation, and the standard library provides a function to do it, so we can shorten this even further:

```rust
use std::fs;
use std::io;

fn read_username_from_file() -> Result<String, io::Error> {
    fs::read_to_string("hello.txt")
}
```

### Where The ? Operator Can Be Used

`?` can be used with both `Result`s and `Option`s. In the `Option` case it works a little bit like [JavaScript's optional chaining operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining).

```rust
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}
```

Here `text` might be the empty string, or perhaps it's a string like `"\nfoo"` where the first line has no last char, so this has to return an `Option`. Note that here too, just like a `Result`, the `?` will turn into a `return` statement if the `Option` is an `Option::None` and return from the whole function. This is quite different from the JavaScript version, where it just ignores the rest of the expression.

Since using the `?` operator can turn into a early `return` statement, the return type of your function must match what `?` is going to return. If you use `?` on a `Result` then your function has to return a `Result` with a compatible error type, and if you use it on an `Option` your function must return an `Option`. This, for example, is not going to compile:

```rust
use std::fs::File;

fn main() {
    // Can't use `?` here!
    let greeting_file = File::open("hello.txt")?;
}
```

This happens because the function signature for `main()` implicitly declares that it returns `()`, not a `Result`. Up until now all our `main()` functions have had this signature, but we can actually allow `main()` to return an error:

```rust
use std::error::Error;
use std::fs::File;

fn main() -> Result<(), Box<dyn Error>> {
    let greeting_file = File::open("hello.txt")?;

    Ok(())
}
```

Whoa! What's this `Box<dyn Error>`? This is a _trait object_, which we'll discuss in [chapter 17](./ch17-object-oriented-features.md#172---using-trait-objects-that-allow-for-values-of-different-types). For now, know that this means "any kind of error". When `main` returns a `Result<(), E>`, if it returns an `Ok` variant, the program will terminate and return 0 [exit code](https://en.wikipedia.org/wiki/Exit_status) to the shell, signalling the program terminated correctly. If it returns an `Err` variant, it print the error to stderr and return a 1 to signal an error. The `main` function can return other types too! It can return anything that implements the [`std::process::Termination` trait](https://doc.rust-lang.org/stable/std/process/trait.Termination.html).

## 9.3 - To `panic!` or Not to `panic!`

If you're an experienced programmer, your language of choice probably has a way to handle errors and something much like panic. You know this stuff, you can probably safely [skip ahead to the next chapter][chap10].

If you're still here: A panic halts the entire program, so should be used sparingly. There are some times where it's good to use `expect()`, `unwrap()`, and `panic!()`:

- In [unit tests][chap11], where you know there isn't supposed to be an error, and you want to fail the test immediately if there is.
- When you know something should never happen. It's perfectly OK to write `let home: IpAddr = "127.0.0.1".parse().unwrap();` because you know this string will parse to a valid IP address.
- When you have detected your program is in an _invalid state_. If you're trying to work out the percentage likelihood that something will happen and you arrive at 200%, then you know there's a bug in your function, and a panic might be reasonable. Even better than panicking when you find you have invalid state, though, is to make it so invalid state cannot be represented in your program. We'll talk a bit about this in [chapter 17][chap17].
- If your function has a _contract_ and the values passed in violate that contract, it might make sense to panic. If your function's documentation clearly states that it requires a value between 0 and 1, and someone passes in a 7, then if you believe this clearly represents an error somewhere in the caller's code, a panic is appropriate. If an illegal value could create some kind of security risk or correctness risk, then a panic is definitely warranted. If your function is already returning a `Result` anyways, it might make sense to just add an error though.
- If you're writing a book about Rust and you want your examples to be short and concise, and a lot of error handling code would obscure the points you are trying to make, then a panic is fine.

There are some places where it's a terrible idea to panic. A panic will halt the whole program, and the program (or if you are writing a library, then the program that is using your library) has no way to recover. These are places where it's better to return an error:

- When you encounter an error that is unlikely, but could happen in normal operation of the program.
- When you're authoring a library. Callers to your library might like the opportunity to abort an operation or try again, instead of crashing the entire application.

Continue to [chapter 10][chap10].

[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap11]: ./ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
[chap13]: ./ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
[chap16]: ./ch16-fearless-concurrency.md "Chapter 16: Fearless Concurrency"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
