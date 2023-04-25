# 10.2 - Traits: Defining Shared Behavior

A _trait_ in Rust is very similar to what most other languages call an interface. A trait defines some set of behavior, and every struct that implements the trait needs to implement that behavior.

## Defining a Trait

Let's suppose we have two types, `Tweet` and `NewsArticle`. We might want to be able to get a summary of tweet, and we might want to be able to get a summary of a news article, so it would make sense for both of these to implement a `summarize()` function. We can define a trait called `Summary` that defines the method signature that these types will need to implement:

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

Note that the trait only defines the method signatures - the contract, if you will - that the types need to implement. Each type is free to implement this function differently.

## Implementing a Trait on a Type

In languages like TypeScript and Go, if we have an interface, and we have a type that defines all the same methods that the interface declares, then the type implements that interface. There's no need to explicitly mark that the type implements the interface. This is called "duck typing", because, as the saying goes, "if it walks like a duck, and it quacks like a duck, then it must be a duck."

Not so in Rust. Here we must explicitly declare that a type implements a trait. The syntax is `impl [TRAIT] for [STRUCT] {}`, and inside the curly braces we place all the methods we wish to implement:

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

Other crates can use the `Summary` trait and implement it on their own types, just like you can implement traits from the standard library on your own types. One thing to note is that if you want to implement a trait on a type, then either the trait or the type (or both) must be local to your crate. You can't use a trait from one external crate, a type from another, and then implement the external trait on the external type in your crate.

This restriction is in place because of something called the _orphan rule_. Let's suppose there's a `color` crate out there. You implement a library crate that uses `color`, but you notice one of the types in `color` doesn't implement the `Display` trait and you want to `println!` a color, so you implement the `Display` trait on that type. Now suppose I'm writing a separate library crate, and I do the same thing. Now suppose someone adds your crate and my crate to their application. At this point, the Rust compiler has two competing implementations for `Display` on this type, so which one does it use? Since Rust has no way to know which is the "correct" one, Rust just stops this from ever happening by forcing the crate to own at least one of the type or trait.

## Default Implementations

Remember how we said a trait just had signatures and no implementations? Well, we lied a little. Sometimes it's handy to be able to define default behavior for a method:

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

Default implementations are allowed to call other methods on the same trait. This allows a trait to provide a lot of functionality while only requiring implementers to implement part of the trait:

```rust
pub trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

Some implementations might only implement `summarize_author()`, while some might implement both methods.

## Traits as Parameters

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

## Returning Types that Implement Traits

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

Specifying a trait as a return type can be very handy when using closures and iterators. Sometimes when using an iterator, the type inferred by the compiler can be quite long, and writing the full type out by hand would be a lot of work without much benefit. Being able to supply a trait here is much more concise.

If you're coming from another language, you might think that `returns_summarizable()` would be able to return a `Tweet` in one branch and a `NewsArticle` in another, but it can't. This restriction is imposed by how this is implemented in the compiler. We'll see how to overcome this with trait objects in [chapter 17](../ch17-object-oriented-features.md#172---using-trait-objects-that-allow-for-values-of-different-types).

## Using Trait Bounds to Conditionally Implement Methods

As we saw [earlier](./ch10-01-generic-data-types.md#in-method-definitions), we can specify an implementation for a method on specific types of a generic type. We can similarly implement a method on specific trait bounds:

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

The implements the `ToString` trait on any type that implements the `Display` trait. Because of this, we can call `to_string()` on any type that implements `Display`.

## `From` and `Into`

`From` and `Into` are two related traits in rust. These are used to convert a type from one type to another. If you implement `From`, you get `Into` for free. We already mentioned [using the `From` trait to convert Errors](../ch09-error-handling.md#propagating-errors) from one type to another. Let's see another example:

```rust
struct Millimeters(u32);
struct Meters(u32);

impl From<Meters> for Millimeters {
    fn from(value: Meters) -> Self {
        return Millimeters(value.0 * 1000);
    }
}

impl From<Millimeters> for Meters {
    fn from(value: Millimeters) -> Self {
        return Meters(value.0 / 1000);
    }
}

fn main() {
    let one_meter = Meters(1);
    let millis = Millimeters::from(one_meter);
    println!("1 meter is {} millimeters", millis.0);

    let one_meter = Meters(1);
    let into_millis: Millimeters = one_meter.into();
    println!("1 meter is {} millimeters", into_millis.0);
}
```

Here `Millimeters::from(one_meter)` and `one_meter.into()` both convert meters into millimeters. When we call `into` the type the meter is converted to is inferred from the annotation on `into_millis`.

Continue to [10.3 - Lifetimes](./ch10-03-lifetimes.md).
