# 14 - More about Cargo and Crates

## 14.1 - Customizing Builds with Release Profiles

Cargo has four built-in release profiles called `dev`, `release`, `test`, and `bench`. `cargo build` will build in the `dev` profile, and `cargo build --release` in the `release` profile, and the other two are used when running tests. Cargo has various settings for for these profiles, which you can override in _Cargo.toml_:

```toml
[profile.dev]
opt-level = 0

[profile.release]
opt-level = 3
```

In this example `opt-level` controls how much Rust tries to optimize your code and can be set from 0 to 3 (these are also the defaults - 0 for dev because you want the build to be fast, 3 for release because you want your program to be fast). For a full list of options see [the cargo documentation](https://doc.rust-lang.org/cargo/reference/profiles.html).

## 14.2 - Publishing a Crate to Crates.io

If you write a library crate, you can publish it to [crates.io](https://crates.io) so other people can use it.

### Setting Up a Crates.io Account

To publish something on [crates.io](https://crates.io), first you'll need to create an account. Then visit [https://crates.io/me](https://crates.io/me), grab your API key, and run:

```sh
$ cargo login your-key-here
```

Your API key will be stored in _~/.cargo/credentials_. This is secret so if anyone gets ahold of your API key, be sure to revoke it and generate a new one, otherwise people can publish crates in your name, and before you know it all your crates will be full of crypto miners or worse.

### Making Useful Documentation Comments

One thing we haven't done much of in our examples so far is to document our public structs and functions, but if you look at any package on [crates.io](https://crates.io) you'll see everything has automatically generated helpful documentation. This documentation comes from _documentation comments_ which start with three slashes instead of two, and support markdown. Documentation comments should be placed immediately before the thing they are documenting:

````rust
/// Adds one to the number given.
///
/// # Examples
///
/// ```
/// let arg = 5;
/// let answer = my_crate::add_one(arg);
///
/// assert_eq!(6, answer);
/// ```
pub fn add_one(x: i32) -> i32 {
    x + 1
}
````

If you run `cargo doc --open` in your project, you can see what the generated documentation for your project will look like. This will also include documentation for any crates that you depend on.

### Commonly Used Sections

We used the `# Examples` markdown heading above to make a section for our examples. Some other commonly used headings:

- `# Panics` describes the scenarios in which the given function might panic.
- `# Errors` describes the kinds of conditions under which this function might return an error, and what kinds of errors are returned.
- `# Safety` should be present for any function that is `unsafe` (see [chapter 19][chap19]).

You don't need all of these on every function. Any examples you provide will automatically be run as tests when you `cargo test`, so you'll know your examples actually work.

### Commenting Contained Items

There's a second kind of documentation comment `//!` that, instead of documenting what comes right after it, documents the "parent" of the comment. You can use these at the root of _src/lib.rs_ to document the crate as a whole, or inside a module to document the module:

```rust
//! # My Crate
//!
//! `my_crate` is a collection of utilities to make performing certain
//! calculations more convenient.

/// Adds one to the number given.
// --snip--
```

### Exporting a Convenient Public API with `pub use`

We talked about this back in [chapter 7](./ch07-packages-crates-modules.md#re-exporting-names-with-pub-use), but sometimes we might organize the internals of our library in such a way that makes sense to use when we're developing it, but is at odds with how someone would actually want to use our crate. If you have some struct or module that is frequently used by users of your crate, but is buried deep in the module hierarchy, this is going to be a pain point for your users.

Here's an example:

```rust
//! # Art
//!
//! A library for modeling artistic concepts.

pub mod kinds {
    /// The primary colors according to the RYB color model.
    pub enum PrimaryColor {
        Red,
        Yellow,
        Blue,
    }

    /// The secondary colors according to the RYB color model.
    pub enum SecondaryColor {
        Orange,
        Green,
        Purple,
    }
}

pub mod utils {
    use crate::kinds::*;

    /// Combines two primary colors in equal amounts to create
    /// a secondary color.
    pub fn mix(c1: PrimaryColor, c2: PrimaryColor) -> SecondaryColor {
        // --snip--
    }
}
```

Users of this crate would have to write code like:

```rust
use art::kinds::PrimaryColor;
use art::utils::mix;

fn main() {
    let red = PrimaryColor::Red;
    let yellow = PrimaryColor::Yellow;
    mix(red, yellow);
}
```

but users of this crate probably don't care about `kinds` or `utils` - to them this should be top level functionality for this crate. We can "re-export" these at the top level with `pub use`:

```rust
//! # Art
//!
//! A library for modeling artistic concepts.

pub use self::kinds::PrimaryColor;
pub use self::kinds::SecondaryColor;
pub use self::utils::mix;

pub mod kinds {
    // --snip--
}

pub mod utils {
    // --snip--
}
```

### Adding Metadata to a New Crate

In order to publish on [crates.io](https://crates.io), our crate needs a name, a description, and a valid [license identifier](https://spdx.org/licenses/):

```toml title="Cargo.toml"
[package]
name = "my_awesome_colors"
version = "0.1.0"
edition = "2021"
description = "A fancy awesome crate for generating colored text in the terminal."
license = "MIT"
```

### Publishing Your Crate

To publish your package run:

```sh
$ cargo publish
```

If someone has already used your name on [crates.io](https://crates.io) then this will fail - names are handed out first-come-first-served. If you make some changes to your crate, bump the version number (using [semantic versioning rules](https://semver.org/)) and then run `cargo publish` again.

### Deprecating Versions from Crates.io with `cargo yank`

Sometimes an older version of your crate will have some terrible security bug, or has a fatal bug that completely breaks it. For this or other reasons, you'll want to stop people from installing this version and warn existing users they need to upgrade. You can't remove an old version, but you can mark it as deprecated:

```sh
$ cargo yank --vers 1.0.1
```

If you accidentally yank the wrong version, you can undo this:

```sh
$ cargo yank --vers 1.0.1 --undo
```

## 14.3 - Cargo Workspaces

Sometimes a library crate gets so large that you want to split it up into multiple smaller crates. Cargo workspaces lets you do this while keeping all the crates together in the same git repo. It's a bit like the Rust version of a monorepo. You can build all packages in a workspace by running `cargo build` from the root folder of the workspace, and run tests in all workspaces with `cargo test`.

### Creating a Workspace

A workspace consists of multiple packages with their own individual _Cargo.yaml_ files, with a single _Cargo.lock_ file at the root of the workspace. We'll create a simple example here with a single binary crate and two library crates. If you want to see the code for this, check [this book's GitHub repo](https://github.com/jwalton/rust-book-abridged/blob/master/examples/ch14-workspace). First we'll create a new directory for our workspace and initialize it as a git repo:

```sh
$ mkdir add
$ cd add
$ git init .
$ echo "/target" > .gitignore
```

The _add_ directory is the root of our workspace, so all other files we create will be relative to this folder. We're going to add three packages to this workspace: "adder", our binary package, and "add_one" and "add_two", our libraries. Let's start by creating these packages as subdirectories:

```sh
$ cargo new adder
$ cargo new add_one --lib
$ cargo new add_two --lib
```

You may have noticed that we ran `git init` in the add directory - we did this because generally we want to commit the entire workspace as a single repo, and if we hadn't run `git init`, then `cargo new ...` would have "helpfully" initialized all three new packages as git repos for us.

Now in the _add_ folder - the root folder of our workspace - we are going to create a _Cargo.toml_ for the entire workspace. This _Cargo.toml_ won't have any metadata or dependencies, it will simply list all the packages that make up the workspace:

```toml
[workspace]

members = [
    "adder",
    "add_one",
    "add_two",
]
```

:::tip
If you do these in the opposite order - create the top-level Cargo.toml first and then create the child packages - it will still work, but as you create each package you'll get warnings from cargo about not being able to find the packages you haven't created yet.
:::

We can build this workspace, to make sure we did everything right:

```sh
$ cargo build
   Compiling add_two v0.1.0 (add/add_two)
   Compiling adder v0.1.0 (add/adder)
   Compiling add_one v0.1.0 (add/add_one)
    Finished dev [unoptimized + debuginfo] target(s) in 0.11s
```

At this point you should have a directory structure inside _add_ that looks like:

```txt
├── .git
├── .gitignore
├── Cargo.lock
├── Cargo.toml
├── add_one
│   ├── Cargo.toml
│   └── src
│       └── lib.rs
├── add_two
│   ├── Cargo.toml
│   └── src
│       └── lib.rs
├── adder
│   ├── Cargo.toml
│   └── src
│       └── main.rs
└── target
```

Note that the top level folder has a _Cargo.lock_ file, but none of the child projects do.

### Referencing Other Packages in the Workspace

We'll put this in _add_one/src/lib.rs_:

```rust
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

We want to use this library in our binary crate in the _adder_ folder. To do this, first we have to add the `add_one` package as a dependency of `adder`:

```toml title="adder/Cargo.toml"
[dependencies]
add_one = { path = "../add_one" }
```

And then we can `use add_one` in the adder package, just as we would any other dependency:

```rust title="adder/src/main.rs"
use add_one;

fn main() {
    let num = 10;
    println!("Hello, world! {num} plus one is {}!", add_one::add_one(num));
}
```

From the _add_ directory we can now run:

```sh
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.00s
     Running `target/debug/adder`
Hello, world! 10 plus one is 11!
```

If we had multiple packages with binary crates in the workspace, we'd have to specify which package to run with `cargo run -p adder`, or we could `cd adder` and then `cargo run` from the adder folder.

### Depending on an External Package in a Workspace

We can depend on an external create in a workspace by adding it to the `[dependencies]` section of the appropriate package's _Cargo.toml_. For example, we can add the `rand` crate to `add_one` in _add_one/Cargo.toml_:

```toml title="add_one/Cargo.toml"
[dependencies]
rand = "0.8.5"
```

If we add `use rand;` inside _add_one/src/lib.rs_, then `cargo build`, we'll see the `rand` package being downloaded. We'll also get a warning because we're `use`ing rand, but we never reference it in the library. Oops!

If we want to use `rand` in other packages in our workspace, we have to add it again to the appropriate _Cargo.yaml_. Since there's only one _Cargo.lock_ file for the whole workspace, if `adder` and `add_one` both depend on `rand`, we know that they will both depend on the same version of `rand` thanks to the common lockfile (at least, assuming the have compatible semver versions in the different _Cargo.toml_ files).

## 14.4 - Installing Binaries with cargo install

You can publish more than just library crates to crates.io - you can also publish binary crates! Users can install your crates with `cargo install`. (This is very similar to `npm install -g` if you're a node.js developer.) For example, `ripgrep` is a very fast alternative to the `grep` command:

```sh
$ cargo install ripgrep
```

Binaries you install this way get put in `~/.cargo/bin` (assuming you're running a default installation of cargo from rustup). You'll probably want to put this folder in your shell's `$PATH`. The name of the installed binary is not necessarily the same as the name of the crate. If you try installing `ripgrep` above, for example, it will install `~/.cargo/rg`.

## 14.5 - Extending Cargo with Custom Commands

Much like git, you can create your own custom cargo commands. If there's an executable on your path called `cargo-something`, then you can run `cargo something` to run that executable. These custom commands will also show up in `cargo --list`.

Continue to [chapter 15][chap15].

[chap15]: ./ch15-smart-pointers.md "Chapter 15: Smart Pointers"
[chap19]: ./ch19/ch19-01-unsafe.md "Chapter 19: Advanced Features"
