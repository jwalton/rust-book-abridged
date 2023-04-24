# 19.5 - Macros

If you're coming to Rust from C or C++, then you're no doubt already familiar with macros. We're going to give a quick introduction to macros here, but if you want to read more you should check out [The Little Book of Rust Macros](https://veykril.github.io/tlborm/introduction.html).

Macros are a kind of "metaprogramming". When we write a Macro, we're actually writing Rust code that generates more Rust code.

- Macros run at compile time, so they have no runtime performance impact (although they can generate code that runs at runtime, which might).
- Macros can take a variable number of parameters (such as the `println!` marco does) which normal Rust functions cannot.
- Macros must be brought into scope or defined before they are called.

## Declarative Macros with `macro_rules!` for General Metaprogramming

_Declarative macros_ are sometimes called "macros by example" or just "macros" (because these are the most common kind of macro you're going to encounter). Here is a very simple macro:

```rust
macro_rules! four {
    () => {
        1 + 3
    };
}

fn main() {
    let x = four!();
    println!("{x}");
}

```

The `macro_rules! four` says we're going to declare a macro named `four!`. Inside the `{}`, the rest of this macro is a little similar to a `match` expression. Each rule in a `macro_rules!` is of the format `(MATCHER) => {EXPANSION};`. When we call a macro, we don't actually pass in parameters like `i32`s or `&str`s, instead we're passing in a snippet of Rust code. When the macro runs, it will try to match the passed in token tree to each matcher in turn. Once it finds a match, we'll replace the whole macro with whatever is in the expansion part.

In the case of our macro above, we just have a single "empty matcher". If you were to try calling `let x = four!("hello");`, you'd get an error telling you `` no rules expected the token `"hello"` ``.

A matcher can contain _captures_ which let us capture some tokens to a _metavariable_. Metavariables start with `$`:

```rust
macro_rules! add_one {
    ($e:expr) => { $e + 1 };
}
```

Here if you called `add_one!(2)` would be replaced with `2 + 1`. Let's have a look at the `vec!` macro, which is a bit more exciting:

```rust
#[macro_export]
macro_rules! vec {
    ( $( $x:expr ),* ) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )*
            temp_vec
        }
    };
}
```

:::info
This is actually a slightly simplified version of `vec!`, because the original tries to preallocate the correct amount of data in the new vector, and this would only serve to make this example even more confusing than it already is.
:::

First, notice we've added the `#[macro_export]` annotation. Without this annotation, this macro can't be used outside of the crate it is defined in.

The `$(),*` part of the matcher here is called a _repetition_. These have the form `$ (...) sep rep`, where `( ... )` is the part that's being repeated, `sep` is an optional separator token, and `rep` defines how many times the pattern can repeat - `?` for zero or one, `*` for zero or more, and `+` for one or more (like in a regular expression).

So `( $( $x:expr ),* )` matches zero or more expressions, separated by commas.

On the right hand side of the `=>` we have the code we're going to expand this to. Inside the `$()` is the repetition part - this code will be inserted once for each time the repetition matches on the matcher side.

So if we were to write `vec![1, 2, 3]`, at compile time this would get replaced with:

```rust
{
    let mut temp_vec = Vec::new();
    temp_vec.push(1);
    temp_vec.push(2);
    temp_vec.push(3);
    temp_vec
}
```

## Procedural Macros for Generating Code from Attributes

A _procedural macro_ is a Rust function that takes in a `TokenStream` of some input source code and produces `TokenStream` of some generated code. There are three kinds of procedural macros: custom derive, attribute-like, and function-like. When we `#[derive()]` a trait, it's going through a custom-derive macro.

Right now procedural macros need to be defined in their own special crate for technical reasons we're going to hand wave away for this book.

### How to Write a Custom `derive` Macro

Let's create some new projects:

```sh
mkdir projects
cd projects
cargo new hello_macro --lib
cd hello_macro
cargo new hello_macro_derive --lib
```

We created two projects, one inside the other. The outer project will contain our trait, and the inner wil going to contain our custom derive macro. We create these two projects one-inside-the-other because they are tightly related; if the code in the outer project changes, odds are the code in the inner project will too. Unfortunately we'll need to publish the two crates to [crates.io](https://crates.io) separately.

In the outer project, we're going to create a trait:

```rust title="hello_macro/src/lib.rs"
pub trait HelloMacro {
    fn hello_macro();
}
```

The idea here is that a when a consumer of our library implements this trait, we want to give them a derive macro that will implement the `hello_macro` method for them. Let's create one more project in the "projects" folder:

```sh
cd ..
cargo new pancakes
```

And then write a file that uses our derive macro:

```rust title="pancakes/src/main.rs"
use hello_macro::HelloMacro;
use hello_macro_derive::HelloMacro;

// This derive attribute will run our derive macro.
#[derive(HelloMacro)]
struct Pancakes;

fn main() {
    // This will print "Hello, Macro! My name is Pancakes!"
    Pancakes::hello_macro();
}
```

In our inner project, we're going to add some dependencies to _Cargo.toml_:

```toml title="hello_macro/hello_macro_derive/Cargo.toml"
[lib]
proc-macro = true

[dependencies]
syn = "1.0"
quote = "1.0"
```

The `proc-macro = true` line [tells Cargo](https://doc.rust-lang.org/cargo/reference/cargo-targets.html#configuring-a-target) that this is a special library that contains procedural macros. This also gives us access to the `proc_macro` crate, which is where `TokenStream` comes from. `syn` is a crate for parsing Rust code into an [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) or _AST_, and `quote` is a crate for turning a syntax tree back into Rust code. `syn` is going to take our `Pancakes` data structure above and turn it into something like:

```rust
DeriveInput {
    // --snip--
    ident: Ident {
        ident: "Pancakes",
        span: #0 bytes(95..103)
    },
    data: Struct(
        DataStruct {
            struct_token: Struct,
            fields: Unit,
            semi_token: Some(
                Semi
            )
        }
    )
}
```

The field we care about for our implementation is the `ident` or "identifier" for our struct. You can see what else will be passed to our macro in the [`syn::DeriveInput` documentation](https://docs.rs/syn/1.0.109/syn/struct.DeriveInput.html).

Here's the code for our macro:

```rust title="hello_macro/hello_macro_derive/src/lib.rs"
use proc_macro::TokenStream;
use quote::quote;
use syn;

// This line tells Rust that this is the macro
// to call when someone does `#[derive(HelloMacro)]`.
#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // Construct a representation of Rust code as a syntax tree
    // that we can manipulate
    let ast = syn::parse(input).unwrap();

    // Build the trait implementation
    impl_hello_macro(&ast)
}

// It's very common to split the derive macro into one function
// that parses the input (`hello_macro_derive`) and one that
// generates the code (`impl_hello_macro`).
fn impl_hello_macro(ast: &syn::DeriveInput) -> TokenStream {
    let name = &ast.ident;

    // `#name` will be replaced with `Pancakes` here.
    let gen = quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello, Macro! My name is {}!", stringify!(#name));
            }
        }
    };

    // Convert `gen` into a `TokenStream`.
    gen.into()
}
```

The `quote!` macro here helps us define the code we want to generate. Note the `#name` template inside of `quote!`. `quote!` has other cool template tricks, so be sure to [check out its documentation](https://docs.rs/quote/latest/quote/). The `stringify!` macro is built into rust and here turns an expression like `1 + 2` into a string like `"1 + 2"`, or here `Pancakes` into `"Pancakes"`.

If you want to run this, there's just one thing left to do. In our _pancakes_ project, we need to add dependencies to _Cargo.toml_ so it can find our trait and macro:

```toml title="pancakes/Cargo.toml"
[dependencies]
hello_macro = { path = "../hello_macro" }
hello_macro_derive = { path = "../hello_macro/hello_macro_derive" }
```

Now you should be able to `cargo run` from the _pancakes_ folder. If you run into trouble, the full source is [available on GitHub](https://github.com/jwalton/rust-book-abridged/tree/master/examples/ch19-hello-macro).

### Attribute-like macros

_Attribute-like_ macros are another kind of procedural macros. They let you define custom attributes, for example:

```rust
#[route(GET, "/")]
fn index() {
```

Unlike a custom derive macro (which can only be applied to structs and enums), these can be applied to any Rust code. To define this macro, you'd create a `macro` function like this:

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
    // --snip--
}
```

The implementation would be just like the derive macro, except that there are two `TokenStream`s - one for the item we are adding this attribute to, and one for the parameters passed to the macro. Like the derive macro, this needs to be in a special crate by itself (or with other procedural macros).

### Function-like macros

The last kind of procedural macro is the _function-like_ macro. The name comes from the fact that we can call them like a function, similar to `macro_rules!` macros:

```rust
let sql = sql!(SELECT * FROM posts WHERE id=1);
```

This macro would be defined as:

```rust
#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
    // --snip--
}
```
