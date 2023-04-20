# 2 - Programming a Guessing Game

This chapter creates a little "guessing game" program. The program picks a random number, you try to guess the secret number, and the program will tell you if you're too high or too low. Hours of fun! We're going to introduce a bunch of concepts but not go into anything in too much detail in this chapter.

Create the project with:

```sh
$ cargo new guessing_game
$ cd guessing_game
```

To start, let's just worry about getting some user input. Open up _src/main.rs_ in your favorite text editor and copy/paste the following:

```rust title="src/main.rs"
use std::io;

fn main() {
    println!("Guess the number!");

    println!("Please input your guess.");

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    println!("You guessed: {guess}");
}
```

You can run this with `cargo run`, and it should ask you to enter a value and then print out what you entered.

In order to read user input, we're using the `io` library from the standard library, but to reference `io` more conveniently we bring it into _scope_. We do this with the first line, `use std::io`. This is a bit like an `import` statement in python or Java, but note that that don't need to explicitly import `io` to use it. We could remove the `use` line and replace `io::stdin()` with `std::io::stdin()`. There are a number of symbols that Rust brings into scope for you from the standard library automatically - things that get used in almost every program you're going to write. This set is called [the _prelude_](https://doc.rust-lang.org/stable/std/prelude/index.html).

## Storing Values with Variables

```rust
    let mut guess = String::new();
```

This creates new String and binds it to a mutable variable called `guess`. By default variables in Rust are immutable. Obviously if this were an immutable string then the `read_line` function would have a difficult time storing anything it it, so we use the `mut` keyword to make it mutable. In the call to `String::new()`, the `::` part tells us that `new` is an _associated function_ implemented on the String type. Many types in Rust implement a `new` constructor like this.

```rust
    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");
```

`read_line` reads some input from stdin, and stores it in `guess`. We pass in `&mut guess` instead of just `guess`. The `&` means we pass a reference to the object that the `guess` variable points to, and `mut` means that `read_line` is allowed to mutate that variable. Passing by reference works very similar to passing by reference in C++ or Go, or passing an object in Java or JavaScript - the called function/method can modify the passed in object, and those changes will be visible in the caller's scope. References also have a lot of implications for ownership. We'll go into references in much greater detail in [chapter 4][chap4].

:::info

If you're coming to Rust from a C++ background, you might assume that without the `&` Rust would pass a copy of `guess`, but this isn't true. When we pass a value without using a reference in Rust, we actually transfer ownership of the value to the called function. This is getting way ahead of ourselves though - again, we'll get there in [chapter 4][chap4].

:::

## Handling Potential Failure with `Result`

In Rust, when a function can fail it returns a `Result` (see [chapter 9][chap9]). `read_line` can theoretically fail - here we're reading from stdin which is probably not going to fail, but if we were reading from a file or a network connection it could.

`Result` is an enum (see [chapter 6][chap6]) which will either be an `Ok` variant in the success case or an `Err` variant to signal an error has occurred. Enums are a bit unique in Rust in that an enum can carry extra information with it. If the `Result` is an `Err`, it will contain the reason why this operation failed. If the `Result` is an `Ok` it could contain some information (although here it doesn't).

We're kind of glossing over the error handling here by calling `expect` on the `Result`, which will cause a _panic_ if there's an error. If you were to remove the call to `expect`, then the program would still compile, but you'd get a warning that you have a possible error case that you might not have handled correctly.

## Printing Values with `println!` Placeholders

The last line is:

```rust
    println!("You guessed: {guess}");
```

`println!` here is a macro that writes some string to stdout. It's very similar to `printf` in C or Go. In one of those languages we could rewrite the above as `printf("You guessed: %s", guess)`.

The `{}` is a placeholder. You can place a single variable directly in the placeholder, but if you have an expression you'd have to use `{}` as the placeholder and then pass your expression as a second parameter:

```rust
    println!("1 + 2 = {}", 1 + 2);
```

## Generating a Secret Number

We now have a program that asks you to guess a number, but we're not yet generating a secret number to guess. Since Rust has no random number generator in the standard library, we'll rely on the "rand" _crate_ from [crates.io](https://crates.io/). Open up _Cargo.toml_, and add "rand" as a dependency:

```toml
[dependencies]
rand = "0.8.5"
```

Just like node.js dependencies, this uses [semantic versioning](https://semver.org/). Here "0.8.5" is short for "^0.8.5", which means Cargo will install a version `>= 0.8.5` and `< 0.9.0`. When you run `cargo build` or `cargo run`, cargo will automatically download this dependency (and any transitive dependencies it relies on) and add them to _Cargo.lock_. If a new patch version of `rand` comes out and you want to upgrade to it, you can update the lock file with `cargo update`. If a new minor or major version comes out, you'd have to update the `Cargo.toml` file.

You can run `cargo doc --open` to generate HTML documentation for all the crates you're using (and all of their dependencies) and also for all of your code (see [chapter 14][chap14]).

Now that we have the "rand" crate, let's update _src/main.rs_:

```rust title="src/main.rs"
use std::io;
use rand::Rng;

fn main() {
    println!("Guess the number!");

    let secret_number = rand::thread_rng()
        .gen_range(1..=100);

    println!("The secret number is: {secret_number}");

    println!("Please input your guess.");

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    println!("You guessed: {guess}");
}
```

This line generates our random number:

```rust
    let secret_number = rand::thread_rng()
        .gen_range(1..=100);
```

`rand::thread_rng()` returns an object that implements the `Rng` _trait_ (see [chapter 10][chap10]). A trait is very similar to what other languages would call an "interface". We call the `gen_range` method (from the `Rng` trait) passing in a _range expression_ to generate a random number between 1 and 100 inclusive (if the range express was `1..100` it would be 1 to 99 inclusive).

Notice we `use rand::Rng` to bring `Rng` into scope. This might seem a little strange, because if you read through this code we never use `Rng` directly. In Rust, though, in order to call the `gen_range` method on an object that has the `Rng` trait we need to have the `Rng` trait in scope.

## Comparing the Guess to the Secret Number

Now that we have a guess from our user and a random number from `rand`, we can compare them. Add `use std::cmp::Ordering` to the top of the file, and then we can:

```rust
    println!("You guessed: {guess}");

    let guess: u32 = guess.trim().parse().expect("Please type a number!");
    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }
```

`comp` compares two comparable things and returns an `Ordering`, which is another enum (like `Result` above). We use a `match` statement to decide what to do with the `Ordering`. A `match` statement is very similar to a `switch/case` statement in other languages. A `match` expression in Rust is made up of _arms_, each of which consists of a pattern to match against, and the code that should be run if the value fits that arm's pattern, with a `=>` between them. Patterns and matches will be covered in more detail in [chapter 6][chap6] and [chapter 18][chap18].

Notice the line in the block above where we call `parse`. We're creating a new variable here called `guess` of type `u32`, but we already had a variable named `guess` of type `String`. This is OK, as Rust lets us _shadow_ the old variable.

We are annotating the new `guess` variable with `: u32`. This makes guess an unsigned 32 bit integer. If you're coming from another language, you might find the need to annotate the type here surprising. Shouldn't Rust be inferring the type automatically based on what `parse` returns? Actually, exactly the opposite is happening. `parse` is a generic function, that can return different types depending on what we want it to return, and the Rust compiler here is inferring from the fact that we're assigning to a u32 that it should call the version of `parse` that returns a u32. In fact, annotating the type of `guess` here also changes the type of `secret_number`. By default `secret_number` would have been an i32 - a signed 32 bit number - because this is the default Rust picks for a number unless we give it reason not to. But, because we're calling `cmp` to compare `secret_number` and `guess`, Rust's type inference engine makes `secret_number` a u32 as well, so we're not comparing mismatched types. The type inference engine in Rust is magic!

## Allowing Multiple Guesses with Looping

The `loop` keyword creates an infinite loop, and the `break` keyword can be used to break out of it:

```rust
    loop {
        println!("Please input your guess.");

        // --snip--

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break; // Break out of this loop.
            }
        }
    }
```

## Handling Invalid Input

When prompted for a guess, if you enter something that isn't a number such as "hello" then the program will crash. This is because `parse` won't be able the parse the number, so will return a `Result` of type `Err`, and the `expect` call will cause a panic. We can use a `match` statement just like we did for `cmp` to handle the Result from `parse` more gracefully:

```rust
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
```

Here we're using `match` as an expression instead of just as flow control. If the user enters a valid number, `parse` will return an `Ok` which will match the first arm of the `match`. This will cause the whole `match` expression to evaluate to `num`, which will be assigned back to `guess`. If the input is invalid, we `continue` to the top of the loop and ask for the number again.

The Err may contain some information, but we're assigning it to the special `_` variable because we don't care what kind of error this is.

Here's the final program:

```rust title="src/main.rs"
use rand::Rng;
use std::cmp::Ordering;
use std::io;

fn main() {
    println!("Guess the number!");

    let secret_number = rand::thread_rng().gen_range(1..=100);

    loop {
        println!("Please input your guess.");

        let mut guess = String::new();

        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        println!("You guessed: {guess}");

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```

Now that you have a rough idea of what a Rust program looks like, and we have some terminology down, let's start looking at some [basic Rust syntax in more detail][chap3].

[chap3]: ./ch03-common-programming-concepts.md "Chapter 3: Common Programming Concepts"
[chap4]: ./ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap6]: ./ch06-enums-and-pattern-matching.md "Chapter 6: Enums and Pattern Matching"
[chap9]: ./ch09-error-handling.md "Chapter 9: Error Handling"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap14]: ./ch14-more-about-cargo.md "Chapter 14: More About Cargo and Crates.io"
[chap18]: ./ch18-patterns-and-matching.md "Chapter 18: Patterns and Matching"
