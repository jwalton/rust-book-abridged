# 2 - Programming a Guessing Game

This chapter creates a little "guessing game" program to introduce some key aspects of Rust. Create the project with:

```sh
$ cargo new guessing_game
$ cd guessing_game
```

Open up _src/main.rs_ in your favorite text editor and copy paste the following:

```rust
// main.rs

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

In order to read user input, we're going to use the `io` library from the standard library, but to reference `io` we need to bring it into _scope_. We do this with the first line, `use std::io`. This is a bit like an `import` statement in python or Java, but note that that don't need to explicitly import `io` to use it. We could remove the `use` line and replace `io::stdin()` with `std::io::stdin()`. By default Rust has a set of items it brings into scope from you from the standard library called [the prelude](https://doc.rust-lang.org/stable/std/prelude/index.html).

## Storing Values with Variables

```rust
    let mut guess = String::new();
```

This creates a mutable variable called `guess` and binds it to a new String. By default variables in Rust are immutable. If this were an immutable string, we wouldn't be able to store anything in it, though, so we use the `mut` keyword to make it mutable. When we call`String::new()` the `::` tells us that `new` is an _associated function_ implemented on the String type. Many types in Rust implement a `new` function like this.

```rust
    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");
```

Here we call `read_line` to read some input from stdin. We pass in `&mut guess` instead of just `guess`. The `&` means we pass a reference to object the variable points to instead of passing a copy. Rust is a pass-by-copy language, and obviously if we passed a copy of the string, then `read_line` wouldn't be able to modify our original. `mut` is required here because we want to let `read_line` modify the contents of the reference. For more information on references see [chapter 4][chap4].

## Handling Potential Failure with `Result`

`read_line` is a function that can fail, so it returns a Result, which is the standard way of doing error handling in Rust. Result is an enum with an `Ok` variant that contains some result value, and an `Err` variant to signal an error has occurred. Here, if the result is an `Err` then `expect` will cause the program to crash and print the given message. If the result is an `Ok`, then `expect` will return the result of the function (which here we're ignoring). We'll talk more about enums in [chapter 6][chap6].

If you were to remove the call to `expect`, then the program would still compile, but you'd get a warning that you have an error you might not have handled correctly. For more about handling errors, see [chapter 9][chap9].

## Printing Values with `println!` Placeholders

The last line is:

```rust
    println!("You guessed: {guess}");
```

The `{}` is a placeholder. You can place a variable directly in the placeholder, but if you have an expression you'd pass it as a second parameter:

```rust
    println!("1 + 2 = {}", 1 + 2);
```

## Generating a Secret Number

Open up _cargo.toml_, and add "rand" as a dependency:

```toml
[dependencies]
rand = "0.8.5"
```

This tells Cargo we depend on the "rand" crate from [crates.io](https://crates.io/). This uses [semantic versioning](https://semver.org/), and here "0.8.5" is short for "^0.8.5", which means Cargo will install a version >= 0.8.5 and less than 0.9.0. When you run `cargo build` or `cargo run`, cargo will automatically download this dependency (and any transitive dependencies it relies on) and add them to _Cargo.lock_ If a new version of `rand` comes out and you want to upgrade to it, you can update the lock file with `cargo update`. To get documentation for all your crates and their dependencies, run `cargo doc --open`.

Now update _main.rs_ to look like this:

```rust
use std::io;
use rand::Rng;

fn main() {
    println!("Guess the number!");

    let secret_number = rand::thread_rng().gen_range(1..=100);

    println!("The secret number is: {secret_number}");

    println!("Please input your guess.");

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    println!("You guessed: {guess}");
}
```

Notice `use rand::Rng` even though we don't reference `Rng` directly in this code. `Rng` here is a _trait_ which is a bit like an interface in Java or TypeScript. When we call `rand::thread_rng()`, this returns an object that implements the `Rng` trait, but in order to call functions from `Rng` we have to have the trait in scope. We'll cover traits in detail in [chapter 10][chap10].

This line:

```rust
    let secret_number = rand::thread_rng().gen_range(1..=100);
```

calls `thread_rng` to create a random number generator, then calls `gen_range` (from the Rng trait), passing in a _range expression_, to generate a random number between 1 and 100 inclusive.

## Comparing the Guess to the Secret Number

Now we have a guess and a randon number, we can compare them. Add `use std::cmp::Ordering` to the top of the file, and then we can:

```rust
    println!("You guessed: {guess}");

    let guess: u32 = guess.trim().parse().expect("Please type a number!");
    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }
```

`comp` compares two comparable things and returns an `Ordering`, which is an enum much like a `Result`. We use a `match` statement to decide what to do with the Ordering.

A `match` expression is made up of arms. An arm consists of a pattern to match against, and the code that should be run if the value given to match fits that arm's pattern. It's similar to a `switch/case` statement in other languages. Patterns and matches will be covered in more detail in [Chapter 6][chap6] and [Chapter 18][chap18].

Also, notice that we've converted the `guess` string variable from stdin into a new `guess` u32 variable - without this we'd be trying to compare a number and a string, which won't compile. The new `guess` variable has the same name as the old `guess` variable! This is OK, as Rust lets us "shadow" the old variable.

Note that we are annotating the type of `guess` with `: u32`. This makes guess an unsigned 32 bit integer. If you're coming from another language, you might find the need to annotate the type here surprising. Shouldn't Rust be working out the type automatically based on what `parse` returns? Actually, exactly the opposite is happening. `parse` is a generic function, that can return different types depending on what we want it to return, and the Rust compiler here is inferring from the fact that we're assigning to a u32 that it should call the `parse` that returns a u32. In fact, perhaps even more surprising, annotating the type of `guess` here also changes the type of `secret_number`. By default `secret_number` would have been an i32 - a signed 32 bit number - because this is the default Rust picks for a number unless there's some reason not to. But, because we're calling `cmp` to compare `secret_number` and `guess`, Rust's type inference engine makes `secret_number` a u32 as well.

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
                break;
            }
        }
    }
```

## Handling Invalid Input

The astute amongst you will have noticed that if you enter something that isn't a number, like "foo", the program will crash. This is because parse() won't be able the parse the number, so will return a Result of type Err, and the expect() call will cause a crash. We can use a `match` statement just like we did for cmp() to handle the Result from parse() more gracefully:

```rust
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
```

If the user enters a valid number, `Parse` will return an Ok Result which will match the "Ok" part of the select and return the number so it can be assigned to `guess`. If not, we `continue` to the top of the loop and ask for the number again.

The `_` in the Err is a catchall value. In this example, we're saying we want to match all Err regardless of what information is inside them.

Here's the final program:

```rust
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

Continue to [chapter 3][chap3].

[chap3]: ./ch03-common-programming-concepts.md "Chapter 3: Common Programming Concepts"
