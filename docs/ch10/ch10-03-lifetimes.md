# 10.3 - Validating References with Lifetimes

Every reference in Rust has a _lifetime_ where the reference is valid. This has to do with [ownership][chap4], so it's a feature that's somewhat unique to Rust.

Just as rustc infers the type of many of our parameters, in most cases Rust can infer the lifetime of a reference (usually from when it is created until it's last use in a function). Just as we can explicitly annotate a variable's type, we can also explicitly annotate the lifetime of a reference in cases where the compiler can't infer what we want.

## Preventing Dangling References with Lifetimes

The main point of ownership is to prevent dangling references - to prevent us from accessing memory after it has been freed. Here's an example:

```rust
fn main() {
    let r;                // ---------+-- 'a
                          //          |
    {                     //          |
        let x = 5;        // -+-- 'b  |
        r = &x;           //  |       |
    }                     // -+       |
                          //          |
    println!("r: {}", r); //          |
}                         // ---------+
```

If you try this, it won't compile. The variable `r` is in scope for the entire `main()` function, but it's a reference to `x` which will be dropped when we reach the end of the inner scope. After we reach the end of that inner scope, `r` is now a reference to freed memory, so Rust's _borrow checker_ won't let us use it.

More formally, we can say that `r` and `x` have different lifetimes, which we've marked in the comments of this example. The borrow checker sees that `r` has a lifetime of `'a`, but references memory that has the lifetime `'b`, and since `'b` is shorter than `'a`, the borrow checker won't allow this.

This version fixes the bug:

```rust
fn main() {
    let x = 5;            // ----------+-- 'b
                          //           |
    let r = &x;           // --+-- 'a  |
                          //   |       |
    println!("r: {}", r); //   |       |
                          // --+       |
}                         // ----------+
```

Here `x` has a larger lifetime than `r`, so `r` can be a valid reference to `x`.

## Generic Lifetimes in Functions

Now for a confusing example that doesn't compile. We're going to pass two string slices to a `longest()` function, and it will return back whichever is longer:

```rust
fn main() {
    let string1 = String::from("abcd");
    let string2 = "xyz";

    let result = longest(string1.as_str(), string2);
    println!("The longest string is {}", result);
}

// This doesn't work!
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

If we try to compile this, we get an error from the borrow checker. The root of the problem here is that in this function, the rust compiler doesn't know ahead of time whether we're going to return `x` or `y`, and since these may have different lifetimes, the compiler can't know how long the returned reference will be valid for. Consider this example of calling this function:

```rust
fn main() {
    let string1 = String::from("abcd");
    let result;

    {
        let string2 = String::from("xyz");
        result = longest(&string1, &string2);
    }

    // This shouldn't compile! But how does rust know that?
    println!("The longest string is {}", result);
}
```

Here if `longest()` returned the reference to `string1`, it would still be valid by the time we get to the `println!`, but if it returned the reference to `string2` it would not. How is the borrow checker supposed to decide if the call to `longest()` is valid? The answer is that it can't. At least, not without a little help from us.

## Lifetime Annotation Syntax

We fix this problem by telling the compiler about the relationship between these references. We do this with _lifetime annotations_. Lifetime references are of the form `'a`:

```rust
&i32        // a reference
&'a i32     // a reference with an explicit lifetime
&'a mut i32 // a mutable reference with an explicit lifetime
```

A lifetime annotation on a single variable isn't very meaningful. Lifetime annotations really describe a constraint on the relationship of references between multiple variables.

## Lifetime Annotations in Function Signatures

We can declare a lifetime annotation for a function in much the same way we add generic types. The lifetime annotation must start with a `'`. Typically they are single characters, much like generic types.

We can fix the `longest()` function in our previous example with:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

What we've done here is to tell the compiler that this function takes an `x` and a `y`, both of which will live for some lifetime which we've called `'a`. This doesn't mean the two parameters passed in need to have the exact same lifetime, it only means that `'a` is the lifetime of the shorter of the two. We say we're going to return a reference that has the same lifetime. In other words we're telling the compiler that the return value of `longest()` will live at least as long as the shorter lifetime of `x` and `y`. When the rust compiler analyzes a call to `longest()` it can now mark it as an error if the two parameters passed in don't adhere to this constraint.

It's important to note that these annotations don't actually change the lifetime of the references passed in, it only gives the borrow checker enough information to work out whether a call is valid.

Returning to this example:

```rust
fn main() {
    let string1 = String::from("abcd");
    let result;

    {
        let string2 = String::from("xyz");
        result = longest(&string1, &string2);
    }

    // This doesn't compile!
    println!("The longest string is {}", result);
}
```

Here the compiler now knows that the return value of `longest()` is only as long as the shorter of `&string1` and `&string2`, so it knows that the use of `result` in the `println!` macro is invalid.

## Thinking in Terms of Lifetimes

The way we annotate lifetimes depends on what the function is doing. If we changed `longest()` to only ever return the first parameter, we could annotate the lifetimes as:

```rust
fn longest<'a>(x: &'a str, y: &str) -> &'a str {
    x
}
```

This tells rustc that the lifetime of the return value is the same as the lifetime of the first parameter.

The lifetime of the return value must have the same annotation as at least one of the parameters. If you created a reference to something you create inside the function and return it, whatever you created will be dropped at the end of the function, so the reference will be invalid.

## Lifetime Annotations in Struct Definitions

So far all the structs we've created in this book have owned all their types. If we want to store a reference in a struct, we can, but we need to annotate it's type. Just like a function, we do this with the generic syntax:

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");
    let i = ImportantExcerpt {
        part: first_sentence,
    };
}
```

Here what we're telling the compiler is that any `ImportantExcerpt` struct can't outlive the reference in the `part` field. (TODO: Why do we have to explicitly annotate this? I would think that no struct could outlive any reference contained within it. When would we ever use multiple different lifetimes in the same struct?)

## Lifetime Elision

Way back in [chapter 4][chap4], we wrote this function:

```rust
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}
```

How come this compiles without lifetime annotations? Actually, in the pre-1.0 days of Rust, it wouldn't have, as lifetime annotations would have been mandatory here. But, over time the Rust team found there were certain cases where the compiler could predictably determine the lifecycle on it's own, and in these cases they are now optional.

What the compiler does is to assign a different lifecycle to every reference in the parameter list (`'a` for the first one, `'b` for the second, and so on...). If there is exactly one input lifetime parameter, that lifecycle is automatically assigned to all output parameters. If there is more than one input lifetime parameter but one of them is for `&self`, then the lifetime of `self` is assigned to all output parameters. Otherwise, the compiler will error.

## Lifetime Annotations in Method Definitions

We can add lifetime annotations to methods using the exact same generic syntax we use for generic structs:

```rust
impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}
```

Here `'a` refers to the lifetime of the struct itself, but thanks to lifetime elision, in `announce_and_return_part()`, the return value is automatically given the same lifetime as `self,` so we don't actually have to use it.

## The Static Lifetime

There's a special lifetime called the `'static` lifetime:

```rust
let s: &'static str = "I have a static lifetime.";
```

This is a slice of a string that's part of the program's binary, so it will always be available. you may see the `'static` lifetime mentioned in error messages when Rust suggests a fix, but unless you actually want a reference that lasts the life of your program, likely the real problem is that you're trying to create a dangling reference or there's lifetime mismatch.

## Generic Type Parameters, Trait Bounds, and Lifetimes Together

```rust
use std::fmt::Display;

fn longest_with_an_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {}", ann);
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

This takes two string slices and returns whichever is longer. It also prints an announcement, which is passed in as a parameter and can be any type that implements the `Display` trait. I think this is a pretty good example of why, if you don't read this book or the original, you're going to struggle with Rust, because especially with the lifetime annotations this doesn't really look like any other programming language.

## Further Reading

[Chapter 17][chap17] discusses _trait objects_, which we didn't talk about here. Something else we didn't talk about here are some more complex scenarios involving [lifecycle annotations](https://doc.rust-lang.org/stable/reference/trait-bounds.html), but those are only needed in very advanced cases and are beyond the scope of this book.

Continue to [chapter 11][chap11].

[chap4]: ./ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap11]: ./ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
