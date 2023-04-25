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

More formally, we can say that `r` and `x` have different lifetimes, which we've marked in the comments of this example, using the labels `'a` and `'b` (strange names, but this is actually a bit of foreshadowing). The borrow checker sees that `r` has a lifetime of `'a`, but references memory that has the lifetime `'b`, and since `'b` is shorter than `'a`, the borrow checker won't allow this.

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

Now for an example that doesn't compile, for what might not at first be obvious reasons. We're going to pass two string slices to a `longest()` function, and it will return back whichever is longer:

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

If we try to compile this, we get an error from the borrow checker. When the Rust compiler checks a call to a function, it doesn't look at the contents of the function, only at the signature. The root of the problem here is that in this function, the rust compiler doesn't know ahead of time whether we're going to return `x` or `y`, and since these may have different lifetimes, the compiler can't know how long the returned reference will be valid for. Consider this example of calling this function:

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

We can declare a lifetime annotation for a function in much the same way we add generic types. The lifetime annotation must start with a `'`. Typically they are single characters, much like generic types. And just like generic types, these will be filled in with a real lifetime for each call to the function.

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

Think about this a bit like a generic function (the syntax is similar for a good reason). We're saying here there exists some lifetime which we're going to call `'a`, and the variables `x` and `y` both life at least as long as this hypothetical `'a`'. They don't have to both be the same lifetime, they just both have to be valid at the start and end of `'a`. Then in the case of this function we're making the claim that the value we return is going to be valid for this same lifetime. At compile time, the compiler will see how long the passed in `x` lives, how long the passed in `y` lives, and then it will verify that the result of this function isn't used anywhere outside of that lifetime.

Putting this a bit more succinctly, we're telling the compiler that the return value of `longest()` will live at least as long as the shorter lifetime of `x` and `y`. When the rust compiler analyzes a call to `longest()` it can now mark it as an error if the two parameters passed in don't adhere to this constraint.

:::info

Lifetime annotations don't actually change the lifetime of the references passed in, it only gives the borrow checker enough information to work out whether a call is valid.

:::

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

The lifetime of the return value must have the same annotation as at least one of the parameters (or be `'static`, which we'll discuss in a moment). If you created a reference to something you create inside the function and return it, whatever you created will be dropped at the end of the function, so the reference will be invalid.

## Lifetime Annotations in Struct Definitions

So far all the structs we've created in this book have owned all their types. If we want to store a reference in a struct, we can, but we need to explicitly annotate it's lifetime. Just like a function, we do this with the generic syntax:

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

Again, it's helpful to think about this like we would any other generic declaration. When we write `ImportantExcerpt<'a>` we are saying "there exists some lifetime which we'll call `'a`" - we don't know what that lifetime is yet, and we won't know until someone creates an actual instance of this struct. When we write `part: &'a str`, we are saying "when someone reads this ref, it has the lifetime `'a`" (and if someone later writes a new value to this ref, it must have a lifetime of at least `'a`). At compile time, the compiler will fill in the generic lifetimes with real lifetimes from your program, and then verify that the constraints hold.

Here this struct has only a single reference, and so it might seem odd that we have to give an explicit lifetime for it. You might think the compiler could automatically figure out the lifetime here (and perhaps one day in this trivial example it will - Rust is evolving pretty rapidly).

:::info

The original ["The Rust Programming Language"](https://doc.rust-lang.org/stable/book/ch10-03-lifetime-syntax.html#lifetime-annotations-in-struct-definitions) here said that "this annotation means an instance of `ImportantExcerpt` can't outlive the reference it holds in its part field," but I found that not a helpful way to think about this - of course a struct can't outlive any references stored inside it. I found [this answer on Stack Overflow](https://stackoverflow.com/questions/27785671/why-can-the-lifetimes-not-be-elided-in-a-struct-definition/27785916#27785916) to be a lot more illuminating.

:::

Here's an example where a struct requires two different lifetime annotations (borrowed from [this Stack Overflow discussion](https://stackoverflow.com/questions/29861388/when-is-it-useful-to-define-multiple-lifetimes-in-a-struct/66791361#66791361) which has some other good examples too):

```rust
struct Point<'a, 'b> {
    x: &'a i32,
    y: &'b i32,
}

fn main() {
    let x = 1;
    let v;
    {
        let y = 2;
        let f = Point { x: &x, y: &y };
        v = f.x;
    }
    println!("{}", *v);
}
```

The interesting thing here is that we're copying a reference out of a struct and then using it after the struct has been dropped. This is okay because in this case the lifetime of the reference is longer than that of the struct. There's no way the compiler could know this without lifetime annotations. We we create the `Point<'a, 'b>` here, the compiler fills in `'a` with the lifetime of `x = 1`, so when we do `v = f.x` the compiler knows v also has that same lifetime. Also in this example, if you tried to give both `x` and `y` the same lifetime annotation, this would fail to compile.

:::tip

Similar to trait bounds, we can add a [_lifetime bound_](https://doc.rust-lang.org/reference/trait-bounds.html#lifetime-bounds) to a lifetime annotation in a function or a struct.

```rust
struct Point<'a, 'b: 'a> {
    x: &'a f32,
    y: &'b f32,
}
```

You can read `'b: 'a` as "`'b` outlives `'a`", and this implies that `'b` must be at least as long as `'a`. There are very few cases where you would need to do such a thing, though.

:::

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

How come this compiles without lifetime annotations? Why don't we have to tell the compiler that the return value has the same lifetime as `s`? Actually, in the pre-1.0 days of Rust, lifetime annotations would have been mandatory here. But there are certain cases where Rust can now work out the lifetime on it's own. We call this _lifetime elision_, and say that the compiler _elides_ these lifetime annotations for us.

What the compiler does is to assign a different lifecycle to every reference in the parameter list (`'a` for the first one, `'b` for the second, and so on...). If there is exactly one input lifetime parameter, that lifecycle is automatically assigned to all output parameters. If there is more than one input lifetime parameter but one of them is for `&self`, then the lifetime of `self` is assigned to all output parameters. Otherwise, the compiler will error.

In the case above, there's only one lifetime that `first_word` could really be returning; if `first_word` created a new `String` and tried to return a reference to it, the new `String` would be dropped when we leave the function and the reference would be invalid. The only sensible reference for it to return comes from `s`, so Rust infers this for us. (It _could_ be a static lifetime, but if it were we'd have to explicitly annotate it as such.)

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
    announcement: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {}", announcement);
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

This takes two string slices and returns whichever is longer. It also prints an announcement, which is passed in as a parameter and can be any type that implements the `Display` trait. (If someone showed you this code before you started reading this book, I wonder what would you have thought it meant?)

## Further Reading

There are some advanced cases where lifetime annotations are required that we haven't discussed here (for example trait bounds sometimes require [lifetime annotations](https://doc.rust-lang.org/stable/reference/types/trait-object.html#trait-object-lifetime-bounds), but they are usually inferred). [The Rust Reference](https://doc.rust-lang.org/reference/index.html) is a good place to read about this sort of thing when you're a little more comfortable with the language.

Lifetimes and ownership are such a central and important part of Rust that I'll also direct you to [this excellent two part blog post](https://mobiarch.wordpress.com/2015/06/29/understanding-lifetime-in-rust-part-i/) on the subject.

Continue to [chapter 11][chap11].

[chap4]: ../ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap11]: ../ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
