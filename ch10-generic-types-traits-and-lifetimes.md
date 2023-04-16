# 10 - Generic Types, Traits, and Lifetimes

## 10.1 - Generic Data Types

### In Function Definitions

We can use generics to define a function that can accept more than one data type. This is just like generics in TypeScript, Java, and Go, or like template functions in C++.

Here's an example of a function to find the largest number in a list:

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}


fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest_i32(&number_list);
    println!("The largest number is {}", result);
}
```

The problem with this function is that it can only accept a list of `i32`. If we wanted to write a version of this for `char` or for `u64`, the function signature would change, but the code in body would be identical. We can use generics here to write the function to accept any number by changing the function signature to:

```rust
// This doesn't QUITE work...
fn largest<T>(list: &[T]) -> &T {
```

The `<T>` after the function name tells the compiler this is a generic function, so anywhere inside the function body where there's a `T`, we'll replace it with some concrete type when the function is actually called.

If you actually try to compile the above though, rustc will complain. The problem is that `T` here could be an `i32` or a `u64`... but it could also be a `struct` or some other arbitrary type. Inside the function we do `item > largest` - how would we decide if one struct was larger than another? We need to restrict what kinds of types can be used in place of T. In this case we only want to allow T to be a type that implements the `str::cmp::PartialOrd` trait. Types that implement this trait can be compared to each other:

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
```

Why a single letter `T` for the generic type? It doesn't have to be; you can use `fn largest<Number>...` instead, and it will work. But in pretty much every language that supports something like generics, the convention is to use a single character.

### In Struct Definitions

Generics aren't just for functions, we can also use them in structs. Here we have a `Point` struct which has an x and a y. Both x and y are type `T`, so they must both be the same type:

```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let integer = Point { x: 5, y: 10 };
    let unsigned: Point<u32> = Point { x: 9, y: 20 };
    let float = Point { x: 1.0, y: 4.0 };

    // This won't work, because we're trying to use two different types
    let wont_work = Point { x: 5, y: 4.0 };
}
```

If we want to support mixed types we can, but we'll have to redefine the struct to allow it:

```rust
struct MultiPoint<T, U> {
    x: T,
    y: U,
}
```

### In Method Definitions

If we create a struct with generic properties, it makes sense that we'll have to define methods that are generic too:

```rust
pub struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    pub fn x(&self) -> &T {
        &self.x
    }
}
```

Note the `impl<T>` - we need the `<T>` here to let rustc know that `T` is not a concrete type. Why? Because we can also declare methods only on specific concrete versions of a generic struct. This will add a `distance_from_origin` to `Point<f32>`, but not to any other Point, such as `Point<u32>`:

```rust
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

We can also add generics to a method independent of the generics on the struct:

```rust
struct Point<X1, Y1> {
    x: X1,
    y: Y1,
}

impl<X1, Y1> Point<X1, Y1> {
    // Note that mixup takes `X2` and `Y2` generic types, in addition to X1 and Y1!
    fn mixup<X2, Y2>(self, other: Point<X2, Y2>) -> Point<X1, Y2> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y);
}
```

### In Enum Definitions

We've already seen a few enums that use generics such as `Option<T>` and `Result<T, E>`:

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### Performance of Code Using Generics

Much like C++ template functions, Rust generics are implemented using _monomorphization_, which is a fancy way of saying it generates a copy of each generic type at compile time, one copy for each type it was used with.

In other words, if we go back to the `fn largest<T>(list: &[T]) -> &T` we started this section with, if you were to call:

```rust
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
```

then internally Rust would actually compile two different functions, a `largest<i32>` and a `largest<char>`. This means generic have no runtime performance impact, but they do make your executable larger.

## 10.2 - Traits: Defining Shared Behavior

A _trait_ in Rust is very similar to what most other languages call an interface. A trait defines some set of behavior, and every struct that implements the trait needs to implement that behavior.

### Defining a Trait

Let's suppose we have two types, `Tweet` and `NewsArticle`. We might want to be able to get a summary of book, and we might want to be able to get a summary of a tweet, so it would make sense for both of these to implement a `summarize()` function. We can define a trait called `Summary` that defines the method signature that these types will need to implement:

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

Note that the trait only defines the method signatures - the contract, if you will - that the types need to implement. Each type is free to implement this function differently.

### Implementing a Trait on a Type

In languages like TypeScript and Go, if we have an interface, and we have a type that defines all the same methods that the interface declares, then the type implements that interface. There's no need to explicitly mark that the type implements the interface. This is called "duck typing", because, as the saying goes, "if it walks like a duck, and it quacks like a duck, then it must be a duck."

Not so in Rust. Here we must explicitly declare that a type implements a trait. The syntax is `impl <TRAIT> for <STRUCT> {}`, and inside the curly braces we place all the methods we wish to implement:

```rust
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

pub struct Tweet {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub retweet: bool,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

This is very similar to defining a method on the struct directly, but the method is actually defined on the trait. If we want to call the `summarize` function, we need to make sure the trait is in scope. In this example we have to `use` both `Summary` and `Tweet`, even though `Summary` never appears in the code:

```rust
use aggregator::{Summary, Tweet};

fn main() {
    let tweet = Tweet {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        retweet: false,
    };

    println!("1 new tweet: {}", tweet.summarize());
}
```

Other crates can use the `Summary` trait and implement it on their own types, just like you can implement traits from the standard library on your own types. One thing to note is that if you want to implement a trait on a type, then either the trait or the type (or both) must be local to your crate. You can't use a trait from one external crate, a type from another, and then implement the external trait on the external type in your crate. This restriction is in place because of something called the _orphan rule_. Basically the problem is that if you did in your library crate, and I did the same thing for the same two types in my library crate, then if a project tried to use both our library crates there would be two different implementations for the same trait and type, and Rust would have no way of knowing which was correct.

### Default Implementations

Remember how we said a trait just had signatures and no implementations? Well, sometimes it's handy to be able to define default behavior for a method:

```rust
pub trait Summary {
    fn summarize(&self) -> String {
        String::from("(Read more...)")
    }
}

// We can implement this trait with an empty
// impl block, taking the default function
// definitions.
impl Summary for NewsArticle {}
```

Default implementations are allowed to call other methods on the trait. This allows a trait to provide a lot of functionality while only requiring implementers to implement part of the trait:

```rust
pub trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

Some implementations might only implement `summarize_author()`, while some might implement both methods.

### Traits as Parameters

We can use a trait as a type for a function parameter or variable using the `impl` keyword:

```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}
```

This is actually syntactic sugar for _trait bound_ syntax:

```rust
pub fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}
```

Here we're declaring a generic function, but we're setting bounds on the type of T. Whatever you pass in for T has to satisfy the `Summary` trait. We can specify more than one trait bound:

```rust
// Using the `impl` syntax:
pub fn notify(item: &(impl Summary + Display)) {...}

// Using a trait bound:
pub fn notify<T: Summary + Display>(item: &T) {...}
```

Here whatever we pass in for `T` must satisfy both our own `Summary` trait and the `Display` trait from the standard library (so we can use `{}` to display the item with `println!` or `format!`).

This can get a bit hard to read if you have a lot of traits bounds. There ends up being a lot of clutter between the name of the function and the parameters. Borrowing a page from SQL, we can also write trait bounds using the `with` syntax. These two examples are equivalent:

```rust
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> i32 {...}

fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{...}
```

### Returning Types that Implement Traits

In addition to using traits as parameters, we can of course also return them. This lets us hide the concrete type from the caller:

```rust
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        retweet: false,
    }
}
```

Specifying a trait as a return type can also be very handy when using closures and iterators. Sometimes when using an iterator, the type inferred by the compiler can be quite long, and writing the full type out by hand would be a lot of work without much benefit. Being able to supply a trait here is much more concise.

If you're coming from another language, you might think that `returns_summarizable()` would be able to return a `Tweet` in one branch and a `NewsArticle` in another, but it can't. This restriction is imposed by how this is implemented in the compiler. We'll see how to overcome this in [chapter 17](./ch17-object-oriented-features.md#172---using-trait-objects-that-allow-for-values-of-different-types).

### Using Trait Bounds to Conditionally Implement Methods

As we saw [earlier](#in-method-definitions), we can specify a implementation for a method only on specific types of a generic type. We can similarly only implement a method on specific trait bounds:

```rust
use std::fmt::Display;

struct Pair<T> {
    x: T,
    y: T,
}

impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```

Here the `new()` associated function is implemented on all generic types, but `cmp_display()` is only defined on a `Pair<T>` if the inner type used for T implements both the `Display` and the `PartialOrd` traits.

We can also conditionally implement a trait for any type that implements some other trait! These are called _blanket implementations_. This example comes from the standard library:

```rust
impl<T: Display> ToString for T {
    // --snip--
}
```

Because of this, we can call `to_string()` on any type that implements the `Display` trait.

## 10.3 - Validating References with Lifetimes

Every reference in Rust has a _lifetime_ where the reference is valid. This has to do with [ownership][chap4], so it's a feature that's somewhat unique to Rust.

Just as rustc infers the type of many of our parameters, in most cases Rust can infer the lifetime of a reference (usually from when it is created until it's last use in a function). Just as we can explicitly annotate a variable's type, we can also explicitly annotate the lifetime of a reference in cases where the compiler can't infer what we want.

### Preventing Dangling References with Lifetimes

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

### Generic Lifetimes in Functions

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

### Lifetime Annotation Syntax

We fix this problem by telling the compiler about the relationship between these references. We do this with _lifetime annotations_. Lifetime references are of the form `'a`:

```rust
&i32        // a reference
&'a i32     // a reference with an explicit lifetime
&'a mut i32 // a mutable reference with an explicit lifetime
```

A lifetime annotation on a single variable isn't very meaningful. Lifetime annotations really describe a constraint on the relationship of references between multiple variables.

### Lifetime Annotations in Function Signatures

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

### Thinking in Terms of Lifetimes

The way we annotate lifetimes depends on what the function is doing. If we changed `longest()` to only ever return the first parameter, we could annotate the lifetimes as:

```rust
fn longest<'a>(x: &'a str, y: &str) -> &'a str {
    x
}
```

This tells rustc that the lifetime of the return value is the same as the lifetime of the first parameter.

The lifetime of the return value must have the same annotation as at least one of the parameters. If you created a reference to something you create inside the function and return it, whatever you created will be dropped at the end of the function, so the reference will be invalid.

### Lifetime Annotations in Struct Definitions

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

### Lifetime Elision

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

### Lifetime Annotations in Method Definitions

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

### The Static Lifetime

There's a special lifetime called the `'static` lifetime:

```rust
let s: &'static str = "I have a static lifetime.";
```

This is a slice of a string that's part of the program's binary, so it will always be available. you may see the `'static` lifetime mentioned in error messages when Rust suggests a fix, but unless you actually want a reference that lasts the life of your program, likely the real problem is that you're trying to create a dangling reference or there's lifetime mismatch.

### Generic Type Parameters, Trait Bounds, and Lifetimes Together

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

### Summary

[Chapter 17][chap17] discusses _trait objects_, which we didn't talk about here. Something else we didn't talk about here are some more complex scenarios involving [lifecycle annotations](https://doc.rust-lang.org/stable/reference/trait-bounds.html), but those are only needed in very advanced cases and are beyond the scope of this book.

Continue to [chapter 11][chap11].

[chap4]: ./ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
Lifetimes"
[chap11]: ./ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
