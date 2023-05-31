# 10.3 - Validating References with Lifetimes

:::info

This chapter explains lifetimes in a somewhat different, and slightly more technical way than the original "The Rust Programming Language" did. If you find the explanation here confusing, you might try reading the original, or check the end of this section for some additional reading. Lifetimes can be one of the more confusing parts of Rust if you're a newcomer. They're a result of Rust's unique ownership system, so there aren't any direct analogs in other languages. As a result, many attempts have been made to explain them, so if you have a hard time don't give up! Somewhere out there, someone will explain this in a way that clicks for you.

:::

## Let's Pretend We're Compilers

Let's pretend we're compilers (beep boop!), and we want to do some type checking. Here's some code that we want to check:

```rust
fn biggest(x: &i32, y: &i32) -> &i32 {
    if *x > *y {
        x
    } else {
        y
    }
}

fn main() {
    let i1 = 7;
    let result;

    {
        let i2 = 8;
        result = biggest(&i1, &i2);
    }

    // This shouldn't compile! But how does rust know that?
    println!("The bigger value is {}", result);
}
```

If we're going to type check the call to `biggest` in `main`, we're going to go look at the signature for the `biggest` function, and compare it to how it is being used. We're only going to look at the signature, because it's the contract for this function and it should contain everything we need to know (and we're busy compilers and we can't possibly be expected to delve into the actual implementation of `biggest`). We're going to see that `biggest` takes two `&i32`, and returns an `&i32`. We're passing in two references to `i32`s, and we're assigning the result to `result` which we can infer to be an `&i32`! So this is fine! Job done, on to the next function.

Well... except it isn't. If you follow through the execution of this code, we're going to end up assigning `result = &i2`, and then we'll try dereference `result` after `i2` has been dropped, creating a use-after-freed error. How are we supposed to know this doesn't compile? We, fellow compilers, are missing some critical information here.

Up until know we've been leaving something out when we talk about references. We've written references as `&i32`, but that is actually not the entire type of a reference. From a type safety perspective, a reference contains three things; the type of the target (here `i32`), whether or not this is a mutable exclusive reference (`&` vs `&mut`), and finally some information about how long that underlying value it is referring to lives. That last value is called the reference's _lifetime_. All three of these things are part of the reference's type, and only when all three are taken into consideration can we make a decision about whether the correct arguments are being passed into or out of a function.

## Some Terminology

Before we go any further, let's define some terminology. We already know the scope (or _lexical scope_) of a variable is the `{}` around where the variable is declared; it's the part of the code where that variable binding is valid. The actual value that a variable is bound to also has a _scope_ (or _liveness scope_) of a slightly different nature - it's the portion of the code where that value is valid. The scope of a value starts where the value is created and ends where the value is dropped.

A reference in Rust has a _lifetime_, which is part of the reference's type. You can naively think of the lifetime as being as long as the liveness scope of the value the reference points to, and that will get you pretty far, but it would be better to think of the lifetime as being _at most_ as long as the scope of the value.

:::info

Some other Rust documentation and articles calls the liveness scope the "lifetime of the value". Why do we use the term "scope" instead? A reference has a lifetime (shorter than or equal to the liveness scope of the value it refers to), but a reference is itself a kind of value with it's own liveness scope, and a reference is bound to a variable with a lexical scope (the liveness scope and lexical scope of a reference are the same, since references are `Copy`). If we used lifetime to talk about liveness scopes, then references would have two different lifetimes, and this chapter would get confusing very quickly.

:::

## Preventing Dangling References with Lifetimes

Let's take a step back and look at a simplified example. Here's some rust code that doesn't compile:

```rust
fn main() {
    let r;

    {
        let x = 5;        // -+-- 'b
        r = &x;           //  |
    }                     // -+ 💥 `x` is freed

    println!("r: {}", r);
}
```

We're trying to create a reference `r` and then use that reference after the value it points to has been dropped, so this shouldn't compile. But again - how does the compiler know this shouldn't compile? The reason is because `x` has a liveness scope that corresponds to the `'b` we've marked in the comments. That means `r` here is not _just_ an `&i32`, `r` has a lifetime which is equal to the `'b` we've annotated above. We can think about r as being of the type `&'b i32`.

Since we're trying to access this `r` outside of the `'b` (which is part of `r`'s type), this is going to fail to compile.

## Lifetime Inheritance

We're also going to introduce a concept here called _lifetime inheritance_. Lifetimes are a lot like objects in OO languages, in that one lifetime inherits from another. A larger lifetime inherits from a smaller lifetime.

No, we didn't get that backwards, although it is slightly unintuitive. In an Object Oriented world, we might say that a `Car` inherits from `Vehicle`, which means that anywhere you want a vehicle, you're allowed to use a car, but if you need a car, not just any vehicle will do. Similarly in Rust, the longer lifetime inherits from the shorter one; if you need a shorter lifetime, you can always convert a longer lifetime into a shorter one, but you can't safely convert a shorter one into a longer one. From a type-safety perspective, we would say if you have a function that takes a reference with a shorter lifetime, you can always type-coerce a longer one into a shorter one, but the reverse is not true.

## Lifetime Annotation Syntax

Since the lifetime is part of the type of a reference, there's a way to name that lifetime in the code called a _lifetime annotation_. Lifetime annotations are always written as part of a generic function or a generic struct, and much like generic types, lifetime annotations usually consist of a single letter:

```rust
&i32        // a reference
&'a i32     // a reference with an explicit lifetime
&'a mut i32 // a mutable reference with an explicit lifetime
```

## Generic Lifetimes in Functions

Let's go back to our `biggest` example from before, and fix it:

```rust
fn biggest<'a>(x: &'a i32, y: &'a i32) -> &'a i32 {
    if *x > *y {
        x
    } else {
        y
    }
}

fn main() {
    let i1 = 7;
    let result;

    {
        let i2 = 8;
        result = biggest(&i1, &i2);
    }

    // This shouldn't compile! But how does rust know that?
    println!("The bigger value is {}", result);
}
```

We've written a generic function here, that's generic over some lifetime `'a`. When the compiler tries to call `biggest`, it needs two references with that lifetime, and it's going to return a reference with that same lifetime.

When the compiler looks at our call to `biggest`, it treats this just like it would any other generic function, and tries to infer a value for `'a`. The compiler sees we are assigning the returned `&'a i32` to `result`, so the lifetime `'a` must be at least as long as the liveness scope of `result`. The reference to `i1` meets this criteria, but the reference to `i2` doesn't - we can't type-coerce a shorter reference into a longer one - so the compiler gives us the error `` `i2` does not live long enough ``. If you want to think about this from a more informal standpoint, what we're doing here is telling the compiler "there exists some lifetime `'a` which we're going to return, and the lifetime scopes of the two values referred to in the arguments needs to be at least that long."

It's important to note here that the liveness scopes of the underlying values that get passed in to the function in the caller don't have to be exactly the same. As we mentioned above, a reference is in itself a value. When you pass a reference into a function, what's actually happening down in the compiler is that we're passing a copy of the reference itself. When you create a new reference, you can think of it as having a lifetime equal to the liveness scope of whatever it points to. When you pass a reference, you can think of the copied reference as being converted into a new type which possibly has a shorter lifetime. When you call `biggest` above, the two references you pass in might have different lifetimes, but inside `biggest` we'll have two copied references which both have the same lifetime, and the return value will have the same lifetime too. This may seem like kind of an overly pedantic way to think about this, but if you have a structure with multiple references in it, thinking about it this way can really help you work through some convoluted error messages from the borrow checker.

:::info

One important thing to note here is that lifetime annotations don't actually change the lifetime of the references passed in, they only gives the borrow checker enough information to work out whether a call is valid.

:::

The way we annotate lifetimes depends on what the function is doing. If we changed `biggest()` to only ever return the first parameter, we would annotate the lifetimes as:

```rust
fn biggest<'a>(x: &'a i32, y: &'b i32) -> &'a i32 {
    x
}
```

This tells the compiler that the lifetime of the return value is the same as the lifetime of the first parameter, and the second parameter doesn't relate to the return value at all. If you walk through our example above with this new definition of `biggest`, you'll see that this would compile - the lifetimes of the returned reference and the reference to `i1` are the same, and the liveness scope of `i2` doesn't matter.

In _most_ cases you will want the annotation in the return value to match the annotation of at least one parameter. See [the `'static` lifetime](#the-static-lifetime) below!

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

Again, it's helpful to think about this like we would any other generic declaration. When we write `ImportantExcerpt<'a>` we are saying "there exists some lifetime which we'll call `'a`" - we don't know what that lifetime is yet, and we won't know until someone creates an actual instance of this struct. When we write `part: &'a str`, we are saying "this ref has that same lifetime `'a`" (and, since you can update the contents of a struct, if someone later writes a new value to this ref, it must have a lifetime of at least `'a`). At compile time, the compiler will fill in the generic lifetimes with real lifetimes from your program, and then verify that the constraints hold.

Here's an example where a struct requires two different lifetime annotations (borrowed from [this Stack Overflow discussion](https://stackoverflow.com/questions/29861388/when-is-it-useful-to-define-multiple-lifetimes-in-a-struct/66791361#66791361) which has some other good examples too):

```rust
struct Point<'a, 'b> {
    x: &'a i32,
    y: &'b i32,
}

fn main() {
    let x1 = 1;
    let v;
    {
        let y1 = 2;
        let f = Point { x: &x1, y: &y1 };
        v = f.x;
    }
    println!("{}", *v);
}
```

One interesting thing here is that we're copying a reference out of a struct and then using it after the struct has been dropped. If we look at this through the lens of type safety, when we create a `Point`, the lifetime of `f.x` which we're calling `'a` is going to be the same as the liveness scope of `x1`. When we assign `v = f.x`, the compiler will infer the type of `v` as `&'a i32`. When we dereference `v`, we're still inside `'a` (since this is the liveness scope of `x`), so this is an acceptable borrow.

If we rewrote the above struct as:

```rust
struct Point<'a> {
    x: &'a i32,
    y: &'a i32,
}
```

then this example would fail to compile. At compile time, the compiler infers the type of `v` to be a `&'a i32` where `'a`'s lifetime as long as the `main` function, and then tries to type-coerce the reference to `x1` and `y1` to be the same. Since the liveness scope of `y1` is shorter than the lifetime that `v` requires, it can't be coerced, so again we get the compiler error `` `y1` does not live long enough ``.

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

How come this compiles without lifetime annotations? Why don't we have to tell the compiler that the return value has the same lifetime as `s`? Actually, in the pre-1.0 days of Rust, lifetime annotations would have been mandatory here. But there are certain cases where Rust can work out the lifetime on it's own. We call this _lifetime elision_, because we are allowed to elide the annotations here. (Elide is a fancy programmer word for "omit" or "hide" or "leave out").

When the compiler comes across a function with one or more references that are missing annotations, the compiler assigns a different lifetime to every missing annotation. If there is exactly one input lifetime parameter, that lifetime is automatically assigned to all output parameters. If there is more than one input lifetime parameter but one of them is for `&self`, then the lifetime of `self` is assigned to all output parameters. Otherwise, the compiler will error.

In the case above, there's only one lifetime that `first_word` could really be returning; if `first_word` created a new `String` and tried to return a reference to it, the new `String` would be dropped when we leave the function and the reference would be invalid. The only sensible reference for it to return comes from `s`, so Rust infers this for us.

Lifetime elision can sometimes get things wrong. We could write a function that returns a static string for example, which would have the special lifetime `'static`. In this case, we'd have to explicitly annotate the lifetimes in this function. But more often than not, lifetime elision guesses correctly, and in the cases where it doesn't we'll safely get a compiler error.

## Lifetime Annotations in Method Definitions

We can add lifetime annotations to methods using the exact same generic syntax we use for functions:

```rust
impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    fn announce_and_return_part(&self, announcement: &str) -> &'a str {
        println!("Attention please: {}", announcement);
        self.part
    }
}
```

Since `part` has a lifetime of `'a`, we can explicitly tell the compiler that the returned value here will have that same lifetime. If we left out the `'a` and just returned `&str`, then lifetime elision would make the return value have the same lifetime as `&self` - this would probably be OK too in most cases, but there could be cases where the lifetime of `'a` is longer than the liveness scope of `self`.

## The Static Lifetime

As we've hinted at above, there's a special lifetime called the `'static` lifetime:

```rust
let s: &'static str = "I have a static lifetime.";
```

This is a slice of a string that's part of the program's binary, so it will always be available. Since a `'static` lifetime is the length of the whole program, and a larger lifetime can always be coerced to a smaller one, you can always safely pass a static reference wherever a reference is required.

You may see the `'static` lifetime mentioned in error messages when Rust suggests a fix, but unless you actually want a reference that lasts the life of your program, likely the real problem is that you're trying to create a dangling reference or there's lifetime mismatch.

You will also sometimes see `'static` used as a trait bound:

```rust
fn print_it( input: impl Debug + 'static ) {
    println!( "'static value passed in is: {:?}", input );
}
```

This means something similar but subtly different to the `'static` lifetime annotation. What this means is that the receiver can hang on to the reference for as long as they like - the reference will not become invalid until they drop it. You can always pass an `owned` value to satisfy a `'static` trait bound. If you move a value into `print_it`, then the value lasts at least as long as `print_it` will, so as far as `print_it` is concerned, the value may as well last forever. You'll see a lot of examples of functions that take `'static` values when we start looking at spawning new threads and dealing with async functions.

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

This takes two string slices and returns whichever is longer. It also prints an announcement, which is passed in as a parameter and can be any type that implements the `Display` trait. (If someone showed you this code before you started reading this book, I wonder what you would have thought of all these random `'a`s scattered throughout the code?)

## Further Reading

- There are some advanced cases where lifetime annotations are required that we haven't discussed here (for example trait bounds sometimes require [lifetime annotations](https://doc.rust-lang.org/stable/reference/types/trait-object.html#trait-object-lifetime-bounds), but they are usually inferred). [The Rust Reference](https://doc.rust-lang.org/reference/index.html) is a good place to read about this sort of thing when you're a little more comfortable with the language.
- The Rustonomicon has a section on [Subtyping and Variance](https://doc.rust-lang.org/nomicon/subtyping.html) which goes into the technical details of how references work within the type system in much greater detail than this chapter did.
- [This excellent two part blog post](https://mobiarch.wordpress.com/2015/06/29/understanding-lifetime-in-rust-part-i/) gives another take on explaining lifetimes.
- [This stack overflow answer](https://stackoverflow.com/questions/27785671/why-can-the-lifetimes-not-be-elided-in-a-struct-definition/27785916#27785916) has an excellent explanation of how lifetime annotations work in structs.
- One thing we didn't talk about in this chapter is reborrows.

Continue to [chapter 11][chap11].

[chap4]: ../ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap11]: ../ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
