# 1 - Getting Started

## 1.1 - Installation

On Linux or MacOS:

```sh
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
xcode-select --install
```

On Windows, check [the Rust Book](https://doc.rust-lang.org/stable/book/ch01-01-installation.html#installing-rustup-on-windows).

Verify your installation with `rustc --version`. Upgrade with `rustup update`.

## 1.2 - Hello, World!

Create a file called "main.rs":

```rust
fn main() {
    println!("Hello, world!");
}
```

Indent with four spaces, not tabs, statements end with ";". `println!` is a macro - you can tell because it ends with "!". More on Macros in [chapter 19][chap19].

Run with:

```sh
$ rustc main.rs
$ ./main
Hello, world!
```

`rustc` compiles the source to an executable called `main`, and then `./main` runs the executable.

## 1.3 - Hello, Cargo!

Cargo is Rust's build system and package manager. It's a bit like `npm` in JavaScript, or the `go` command in Go.

### Creating a Project with Cargo

```sh
$ cargo new hello_cargo
$ cd hello_cargo
```

This creates a _cargo.toml_ file and a _src/main.rs_ file. The `[package]` section of _cargo.toml_ describes metadata about the current package, and the `[dependencies]` section lists any packages (aka "crates") that your project depends on.

Build and run this project with:

```sh
$ cargo build
$ ./target/debug/hello_cargo
```

Or:

```sh
$ cargo run
```

Note that `cargo build` creates a _Cargo.lock_ file - this is a dependency lockfile which means if you share this project with a friend, and they `cargo build`, they'll get exactly the same dependencies that you did. You can also

You can verify that a project compiles without producing an executable with `cargo check`, which is often much faster than `cargo build`. You can build a "release version" of your code with `cargo build --release` which will generate an executable in target/release instead of target/debug.

Continue to [chapter 2][chap2].

[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"