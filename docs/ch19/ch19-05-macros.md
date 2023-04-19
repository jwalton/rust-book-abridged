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

The `macro_rules! four` says we're going to declare a macro named `four!`.  Inside the `{}`, the rest of this macro is a little similar to a `match` expression. Each rule in a `macro_rules!` is of the format `(MATCHER) => {EXPANSION};`. When we call a macro, we don't actually pass in parameters like `i32`s or `&str`s, instead we're passing in a snippet of Rust code. When the macro runs, it will try to match the passed in token tree to each matcher in turn. Once it finds a match, we'll replace the whole macro with whatever is in the expansion part.

In the case of our macro above, we just have a single "empty matcher".  If you were to try calling `let x = four!("hello");`, you'd get an error telling you `` no rules expected the token `"hello"` ``.

A matcher can contain _captures_ which let us capture some tokens to a _metavariable_.  Metavariables start with `$`:

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

:::note

This is actually a slightly simplified version of `vec!`, because the original tries to preallocate the correct amount of data in the new vector, and this would only serve to make this example even more confusing than it already is.

:::

First, notice we've added the `#[macro_export]` annotation.  Without this annotation, this macro can't be used outside of the crate it is defined in.

The `$(),*` part of the matcher here is called a _repetition_.  These have the form `$ (...) sep rep`, where `( ... )` is the part that's being repeated, `sep` is an optional separator token, and `rep` defines how many times the pattern can repeat - `?` for zero or one, `*` for zero or more, and `+` for one or more (like in a regular expression).

So `( $( $x:expr ),* )` matches zero or more expressions, separated by commas.

On the right hand side of the `=>` we have the code we're going to expand this to.  Inside the `$()` is the repetition part - this code will be inserted once for each time the repetition matches on the matcher side.

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

A _procedural macro_ is a Rust function that generates code.  There are three kinds of procedural macros: custom derive, attribute-like, and function-like.  When we `#[derive()]` a trait, it's going through a custom-derive macro.

TODO: Finish this section.  For now, dear reader, I direct you [the original version of this section](https://doc.rust-lang.org/stable/book/ch19-06-macros.html#procedural-macros-for-generating-code-from-attributes).