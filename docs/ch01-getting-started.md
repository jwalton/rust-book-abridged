# 1 - Getting Started

This chapter is going to get Rust installed, and explain how to use `cargo` to create and build a new project.

## 1.1 - Installation

On Linux or MacOS:

```sh
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
xcode-select --install
```

On Windows, you can still use `rustup`, but check [the official documentation](https://forge.rust-lang.org/infra/other-installation-methods.html) for how to go about installing it.

Verify your installation with `rustc --version`. Upgrade with `rustup update`.

## 1.2 - Hello, World!

Tradition dictates that we can't learn a new programming language without starting with a program that prints "Hello, world!". Let's create a file called "main.rs":

```rust title="main.rs"
fn main() {
    println!("Hello, world!");
}
```

Indenting in Rust is done with four spaces, not tabs, and statements end with ";". Here we're calling the `println!` macro - you can tell its a macro because it ends with `!`. You can run this with:

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

This creates a _Cargo.toml_ file and a _src/main.rs_ file inside a new folder, and also initializes the new folder as a git repo. _Cargo.toml_ is a [toml](https://toml.io/en/) file (which looks a lot like an old-fashioned Windows .ini file). The `[package]` section of _Cargo.toml_ describes metadata about the current package, and the `[dependencies]` section lists any libraries (aka _crates_) that your project depends on.

We can build and run this project with:

```sh
$ cargo build
$ ./target/debug/hello_cargo
```

Or with this shortcut, which is equivalent to the above:

```sh
$ cargo run
```

Note that `cargo build` creates a _Cargo.lock_ file - this is a dependency lockfile which means if you share this project with a friend, and they `cargo build`, they'll get exactly the same dependencies that you did. It's a good idea to commit the lockfile to your source code management tool.

You can verify that a project compiles without producing an executable with `cargo check`, which is often much faster than `cargo build`. You can build a "release version" of your code with `cargo build --release` which will generate an executable in target/release instead of target/debug. The release version will be missing symbols and some runtime safety checks, and will be better optimized.

Continue to [chapter 2][chap2].

[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"
