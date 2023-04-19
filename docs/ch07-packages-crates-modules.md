# 7 - Managing Growing Projects with Packages, Crates, and Modules

So far all of our examples have lived in a single file, but almost any non-trivial program would be too large to fit in a single file. Rust provides a number of tools to help us organize a project:

- _Modules_ group together related code, and let you control what is a private implementation detail and what should be public interface.
- _Crates_ are a tree of modules that produce a library or an executable. Back in [chapter 2][chap2] we installed the `rand` crate to help us generate random numbers.
- _Paths_ are used to reference a function, struct, enum, etc... from some other module or crate.
- _Packages_ are what you actually check into git (or your source control of choice) - a package contains a library crate, one or more binary crates, or both.
- _Workspaces_ let you group together a large set of related packages, similar to a monorepo (TODO: Is this true?). We'll wait until [chapter 14][chap14] to talk about workspaces

## 7.1 Packages and Crates

In many compiled languages - C or Java for example - the "unit of compilation" is a single file. In a C project, every .c source file compiles to a single object file (a .o file on most platforms), and then all the .o files get linked together into a single executable (or into a dynamically linked library). If you change a .c file in a big project, you only have to recompile that single .c file and then relink all the object files.

In Rust, the unit of compilation is the _crate_. Crates come in two forms - library crates and binary crates, but most of the crates you're going to deal with are libraries, so the terms "crate", "library", and "library crate" are all used interchangeably when talking about Rust.

A _package_ is purely a cargo concept (in other words, `rustc` doesn't know anything about packages). A package is what you get when you run `cargo new` - a _cargo.toml_ file, and a src folder (possibly with subfolders) containing one or more source files.

The _crate root_ is the file (or files) that rustc starts working from. If a package contains a src/main.rs file with a `main()` function, then the package contains a binary crate with the same name as the package. If a package contains a _src/lib.rs_, then it contains a library crate (again with the same name as the package). If it has both, then the package contains both a library crate and a binary crate. You might want to include both if you want a simple program that executes your library. For example, if you were writing a library to convert JPG images to PNG format, you might include both a library crate that other developers can use and a binary crate implementing a command line tool that uses the library. If you want to include more than one binary crate in a package, you can add files in src/bin. Each file placed there will be compiled as a separate binary crate.

## 7.2 Defining Modules to Control Scope and Privacy

A _module_ is quite similar to a package in Go, and is somewhat similar to a package in Java. If you're a JavaScript developer, then a module is close to an ESM module, except you can split a module up over multiple files.

`rustc` always starts at the crate root (usually _src/main.rs_ or _src/lib.rs_) - it compiles this file, and any time it finds a `mod` statement, it adds the associated module to the crate and compiles it too. Suppose in _main.rs_ we have the statement `mod garden` - Rust will look for the code for this module in three places:

- Inline (e.g. `mod garden { /* code goes here */ }`)
- In _src/garden.rs_.
- In _src/garden/mod.rs_ (older style)

Similarly modules can defined submodules. _src/garden.rs_ can have a `mod vegetables` that might be defined in _src/garden/vegetables.rs_ (note that garden's submodules go in a folder named "garden", not in the same folder).

Note that we've marked the _src/garden/mod.rs_ version as "older style". This is still supported (and as we'll see in [chapter 11][chap11] it's very handy for writing integration tests) but the _src/garden.rs_ is the one you should use by default. If you try to use the mix the `[name].rs` and `[name]/mod.rs` styles in the same module, you'll get a compiler error.

Every identifier at the top level of a Rust source file has a _path_ associated with it. If we created a struct called `Asparagus` in the vegetables module, then the absolute path for that struct would be `crate::garden::vegetables::Asparagus`.

Each identifier declared in a source file is also private by default, meaning it can only be accessed by functions inside that module (or it's submodules - submodules always have visibility into the private details of their ancestors). To make any identifier public you use the `pub` keyword, like `pub fn do_the_thing() {...}` or `pub mod garden`.

The `use` keyword is used to bring paths into scope. If you `use crate::garden:vegetables::Asparagus` in a file, then you can use `Asparagus` to refer to this struct instead of using the full path.

### Grouping Related Code in Modules

In the restaurant industry, the dining room and other places of the restaurant where customers go is called the "front of house" and the kitchen and offices and parts where customers are rarely seen are called the "back of house". Let's create library for managing a restaurant. We'll run `cargo new restaurant --lib` to create a library crate, and in _src/lib.rs_ we'll put:

```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}

        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {}

        fn serve_order() {}

        fn take_payment() {}
    }
}
```

We'll just defined the modules inline here, because this is convenient for the purposes of an example, but usually we'd split this modules up into multiple files.

## 7.3 Paths for Referring to an Item in the Module Tree

To refer to an item in the module tree, we use a path. Paths come in two forms:

- An _absolute path_ starts from the crate root. For external library creates we're using, this starts with the name of the crate (e.g. `rand`) and for code within the current crate it starts with `crate`.
- A _relative path_ starts from the current module. It starts with an identifier in the current module or with `self` or `super`.

Using our restaurant example, let's say we want to call the `add_to_waitlist()` function. From the top level of src/lib.rs we could do this in two ways:

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

pub fn eat_at_restaurant() {
    // Absolute path
    crate::front_of_house::hosting::add_to_waitlist();

    // Relative path, since this function is defined
    // the same modules as `front_of_house`.
    front_of_house::hosting::add_to_waitlist();
}
```

Relative paths have the clear advantage that they are shorter. Absolute paths have the advantage that, if you move a function from one place to another, all the absolute paths in that function won't have to change (although obviously all the paths pointing to the moved function will).

We have to mark `hosting` and `add_to_waitlist()` as `pub` in order for `eat_at_restaurant()` to compile. This is because `eat_at_restaurant()` is defined at the root of the crate, and `hosting` and `add_to_waitlist()` are in child modules. A parent cannot access the private contents of a another module, unless that other module is an ancestor - `add_to_waitlist()` could access private members of `front_of_house` or the root of the crate.

### Starting Relative Paths with super

The `super` keyword is used in a module path in exactly the same way as `..` is used in a file path - it goes up one level in the module tree:

```rust
fn deliver_order() {}

mod back_of_house {
    fn fix_incorrect_order() {
        cook_order();
        // Call into `deliver_order()` in the parent module.
        super::deliver_order();
    }

    fn cook_order() {}
}
```

### Making Structs and Enums Public

`pub` is used to make an identifier visible outside of the module, but there are a few special considerations for structs and enums. When you make a `struct` public, by default all of it's fields are private and can only be accessed inside the module. You need to mark individual fields as `pub` if you want them to be used outside:

```rust
mod back_of_house {
    pub struct Breakfast {
        pub toast: String,
        seasonal_fruit: String,
    }

    impl Breakfast {
        // Constructor for a summer Breakfast.
        pub fn summer(toast: &str) -> Breakfast {
            Breakfast {
                toast: String::from(toast),
                seasonal_fruit: String::from("peaches"),
            }
        }
    }
}

pub fn eat_at_restaurant() {
    // Order a breakfast in the summer with Rye toast
    let mut meal = back_of_house::Breakfast::summer("Rye");
    // Change our mind about what bread we'd like
    meal.toast = String::from("Wheat");
    println!("I'd like {} toast please", meal.toast);

    // The next line won't compile if we uncomment it; we're not allowed
    // to see or modify the seasonal fruit that comes with the meal
    // meal.seasonal_fruit = String::from("blueberries");
}
```

The `pub toast` field can be read and written outside of the `back_of_house` module, but the private `seasonal_fruit` cannot. Note that the existence of this private field implies that other modules won't be able to create a new instance of `Breakfast`, since they won't be able to set this private field. Here we've created a public associated function called `summer()` to act as a sort of constructor.

Enums behave exactly the opposite to structs. When we make an enum `pub`, all of it's variants and all fields defined on all variants are automatically `pub` as well.

## 7.4 - Bringing Paths into Scope with the `use` Keyword

We've already seen many examples of using the `use` keyword to bring something into scope. We can use it with modules within our crate to bring members from a child module into scope, too:

```rust
use crate::front_of_house::hosting;

mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

pub fn eat_at_restaurant() {
    // Don't need to use `front_of_house::hosting::add_to_waitlist()`
    // here because we brought `hosting` into scope with the `use`
    // above.use crate::front_of_house::hosting;


    hosting::add_to_waitlist();
}
```

You can think about `use` a bit like a symbolic link in a file system, or a bit like JavaScript's `import { add_to_waitlist } from './hosting.js'`. It adds a symbol to the scope of the `use` statement.

One thing to note about modules is that, whether they're split into another file or used inline, the `mod` keyword always creates a new scope that doesn't inherit anything from the parent scope. When we create a scope using braces, in most cases we assume all symbols from outside those braces will be available in the child scope. For example:

```rust
fn say_hello() {
    let name = "Jason",

    {
        println!("Hello {}!", name);
    }
}
```

Here `name` is visible inside the scope created by the inner braces. The scope created by `mod` however doesn't bring in anything from the parent scope:

```rust
mod front_of_house {
    mod serving {
        fn serve_order() {}
    }

    pub mod hosting {
        fn seat_at_table() {
            // This won't compile!  `serving` is undefined here,
            // even though it was defined one scope up.
            serving::server_order();
        }
    }
}
```

This also means a `use` statement at the top level of a file will only bring a symbol into scope for the top-level module, and not for any inline modules. If you want to `use` a symbol inside an inline `mod`, you'll need to put the `use` inside that module:

```rust
use crate::front_of_house::hosting;


mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}


mod customer {
    // We need this `use` here, even though we're already
    // `use`ing hosting at the top level, because
    // `mod customer` creates a new scope that doesn't
    // inherit any symbols.
    use crate::front_of_house::hosting;

    pub fn eat_at_restaurant() {
        hosting::add_to_waitlist();
    }
}
```

This seems a bit strange at first, but it makes sense when you realize that modules are generally intended to be split across multiple files.

### Creating Idiomatic use Paths

These two listings do the same thing:

```rust
// Version 1
use crate::front_of_house::hosting;
fn fn1() {
    hosting::add_to_waitlist();
}

// Version 2
use crate::front_of_house::hosting::add_to_waitlist;
fn fn2() {
    add_to_waitlist();
}
```

But the first one is considered idiomatic and the second is not. Generally we `use` a module, and don't `use` individual functions within a module. This makes for more typing, because we need to type the name of the module, but it also makes it clear that the function comes from some other module and isn't defined locally.

On the other hand, when bringing structs and enums into scope, we generally `use` the individual struct or enum instead of the parent module. For example, we `use std::collections::HashMap;`, and then just type `HashMap`.

If you want to use two data types from different modules that have the same name, you can either refer to them by their namespace:

```rust
use std::fmt;
use std::io;

fn fn1() -> fmt::Result {...}
fn fn2() -> io::Result {...}
```

Or you can use the `as` keyword to rename a symbol:

```rust
use std::fmt::Result as FmtResult;
use std::io::Result as IoResult;

fn fn1() -> FmtResult {...}
fn fn2() -> IoResult {...}
```

### Re-exporting Names with `pub use`

You can "re-export" a symbol from some other module in your module:

```rust
mod colors {
    pub struct Color {
        red: u8,
        green: u8,
        blue: u8,
    }
}

mod ansi {
    pub fn color_string(message: &str, color: crate::colors::Color) -> String {
        // --snip--
    }

    pub use crate::colors::Color;
}

fn log_error(message: &str) {
    let red = ansi::Color{red: 255, green: 0, blue: 0};
    println!("{}", ansi::color_string(message, red));
}
```

Here callers of `ansi` can use `ansi::Color`, even though `Color` us actually defined in the `colors` module.

### Using External Packages

Many useful crates are published on [crates.io](https://crates.io/), and we can use these by adding them to the "dependencies" section of _cargo.toml_. We did this back in [chapter 2][chap2] when we built our guessing game. There we added the `rand` crate:

```toml
rand = "0.8.5"
```

And then we `use`d the `Rng` trait from rand:

```rust
use rand::Rng;

fn main() {
    let secret_number = rand::thread_rng().gen_range(1..=100);
}
```

### Using Nested Paths to Clean Up Large use Lists

These two sets of use statements are equivalent:

```rust
// This:
use std::cmp::Ordering;
use std::io;


// Can be shortened to this:
use std::{cmp::Ordering, io};
```

There's no difference between these, the second is just shorter. If we want to `use` a module and some members of that module, we can use the `self` keyword:

```rust
// This:
use std::io;
use std::io::Write;


// Can be shortened to this:
use std::io::{self, Write};
```

### The Glob Operator

This will do exactly what you think it will:

```rust
use std::collections::*;
```

This brings all public symbols in the `std::collections` module into scope. This is frequently used when writing tests, to bring everything in a module into scope in the test. We'll talk more about testing in [chapter 11][chap11].

## Separating Modules into Different Files

We've used the inline style for modules in this chapter because we've been working with short examples, but in real life any non-trivial program is probably going to be split across multiple files:

In _src/lib.rs_:

```rust
mod front_of_house;

pub use crate::front_of_house;

pub fn eat_at_restaurant() {
    front_of_house::add_to_waitlist();
}
```

And then in _src/front_of_house.rs_:

```rust
pub fn add_to_waitlist() {}
```

You only need to load a file with `mod` once in your entire module tree, not in every place it is `use`d. `mod` is not like `include` or `import` from other programming languages.

Note that it's perfectly acceptable to have a small module be defined inline. You can always move it into its own file later if it grows. Since the path of a symbol doesn't change based on whether a module is inline or in a separate file, moving inline code into files doesn't require any refactoring work.

Continue to [chapter 8][chap8].

[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"
[chap8]: ./ch08-common-collections.md "Chapter 8: Common Collections"
[chap11]: ./ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
[chap14]: ./ch14-more-about-cargo.md "Chapter 14: More About Cargo and Crates.io"
