# 19.2 - Advanced Traits

For an introduction to traits, see [chapter 10](../ch10/ch10-02-traits.md).

## Specifying Placeholder Types in Trait Definitions with Associated Types

_Associated types_ are a bit like generics for traits. Associated types let us define a trait that uses some type without knowing what the concrete type is until the trait is implemented:

```rust
pub trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;
}
```

The implementor is the one that specifies the concrete type of the associated type:

```rust
// An iterator that returns an unlimited supply of 7s:
struct ForeverSevenIterator {}

impl Iterator for ForeverSevenIterator {
    // Must fill in the concrete type here.
    type Item = i32;

    fn next(&mut self) -> Option<i32> {
        return Some(7);
    }
}
```

Although of course if our type is generic, we can use the generic to fill in the associated type:

```rust
struct ForeverIterator<T> {
    pub val: T,
}

impl<T> Iterator for ForeverIterator<T> {
    type Item = T;

    fn next(&mut self) -> Option<T> {
        return Some(self.val);
    }
}
```

How are associated types and generics different? Why is this not just:

```rust
pub trait GenericIterator<T> {
    fn next(&mut self) -> Option<T>;
}
```

Well, actually, we _can_ do this. You can have generic traits, but there's an important difference: a trait with an associated type can only be implemented for a given type once, but a trait with a generic type could be implemented for a given type multiple times for different generic types.

This means, practically speaking, that if someone implemented `GenericIterator` then whenever we called `next`, we'd have to explicitly annotate the type of the return value so we'd know which version of `next` to call.

```rust
struct ForeverSevenIterator {}

impl GenericIterator<i32> for ForeverSevenIterator {
    fn next(&mut self) -> Option<i32> {
        return Some(7);
    }
}

impl GenericIterator<String> for ForeverSevenIterator {
    fn next(&mut self) -> Option<String> {
        return Some(String::from("seven"));
    }
}

fn main() {
    let mut iter = ForeverSevenIterator{};
    // Need to type annotate here, because
    // `iter.next()` can return an i32 or a string.
    let v: Option<i32> = iter.next();
}
```

This isn't a problem for associated types, because we know there can only ever be one `impl Iterator for Counter`.

## Default Generic Type Parameters and Operator Overloading

When we have a generic type, we can specify a _default type parameter_ that will be used if no generic type is specified:

```rust
struct Point<T = i32> {
    x: T,
    y: T,
}

// Don't need to specify `Point<i32>` here.
fn foo(p: Point) {
    println!("{}, {}", p.x, p.y)
}

```

Generally there are two cases where a default type parameter is useful. You can use it to make a non-generic type generic without breaking existing uses, and you can allow customization in places where most users won't need it.

_Operator overloading_ lets you define custom behavior for certain operators. For example, we all understand what happens when we apply the `+` operator to two `i32`s. But, what if we want to add two `Point`s together?

```rust
#[derive(Debug, Copy, Clone, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    assert_eq!(
        Point { x: 1, y: 0 } + Point { x: 2, y: 3 },
        Point { x: 3, y: 3 }
    );
}
```

Rust lets us define the behavior of the `+` operator by implementing the `Add` trait:

```rust
use std::ops::Add;

impl Add for Point {
    type Output = Point;

    fn add(self, other: Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}
```

The [`std:ops` section of the standard library](https://doc.rust-lang.org/std/ops/index.html) describes what operators you can overload this way. If we have a look at the `Add` trait, it has an `Output` associated type, but the `Add` trait is also generic, and lets us specify the `Rhs` or "right-hand-side":

```rust
trait Add<Rhs=Self> {
    type Output;

    fn add(self, rhs: Rhs) -> Self::Output;
}
```

Again, this is an example of a generic with a default type parameter. We didn't specify an `Rhs` above so it defaults to `Self` (or in this case `Point`). Generally when you want to add a thing to another thing, they're going to be of the same type, so here the default saves us some typing.

But having the `Rhs` be a generic type means we can also implement `Add` for cases where we're adding together two different types. Here's an example where we define a `Millimeters` and `Meters` type, and specify how to add meters to millimeters:

```rust
use std::ops::Add;

struct Millimeters(u32);
struct Meters(u32);

impl Add<Meters> for Millimeters {
    type Output = Millimeters;

    fn add(self, other: Meters) -> Millimeters {
        Millimeters(self.0 + (other.0 * 1000))
    }
}
```

## Fully Qualified Syntax for Disambiguation: Calling Methods with the Same Name

The first time you saw that `impl TRAIT for TYPE` syntax, you probably realized you could have two different traits that each defined a function called `foo`, and then you could create a type that implemented both traits. In fact, you can also have a trait that defines a method named `foo` that differs from a method defined on the struct outside any trait also called `foo`. The `Human` struct in this next example has three different methods called `fly`:

```rust
trait Pilot {
    fn fly(&self);
}

trait Wizard {
    fn fly(&self);
}

struct Human;

impl Pilot for Human {
    fn fly(&self) {
        println!("This is your captain speaking.");
    }
}

impl Wizard for Human {
    fn fly(&self) {
        println!("Up!");
    }
}

impl Human {
    fn fly(&self) {
        println!("*waving arms furiously*");
    }
}

fn main() {
    let person = Human;

    // If there's more than one `fly`, and you
    // don't specify the one you want, this
    // will call the one from the struct.
    // This prints "*waving arms furiously*".
    person.fly();

    // We can also call this as:
    Human::fly(&person);

    // We can explicitly call the `fly` method
    // from either trait:
    Pilot::fly(&person);
    Wizard::fly(&person);
}
```

When we call these methods explicitly like this, we have to pass in the `self` parameter, as if we were calling these like an associated function. (We've already seen an example of this syntax when we called `Rc::clone`, although we didn't know it at the time!)

Although, this brings up an interesting point; if we can call a method on a trait using the associated function syntax, can we define an associated function on a trait?

```rust
trait Animal {
    fn baby_name() -> String;
}

struct Dog;

impl Animal for Dog {
    fn baby_name() -> String {
        String::from("puppy")
    }
}

fn main() {
    println!("A baby dog is called a {}", Dog::baby_name());
}
```

But what happens here if `Dog` also has an associated function also called `baby_name`?

```rust
impl Dog {
    fn baby_name() -> String {
        String::from("Spot")
    }
}
```

Now this program will print "A baby dog is called a Spot", which is not what we want. We can't fix this with `Animal::baby_name()` either, since the compiler won't know whether to call the `Dog` version of `Animal::baby_name()` or some other version. We might have a `Cat` concrete type that also implements the `Animal` trait for example, and `Animal::baby_name()` would be ambiguous.

Here we can disambiguate with:

```rust
fn main() {
    println!("A baby dog is called a {}", <Dog as Animal>::baby_name());
}
```

You could use this same syntax in our `Human` example above:

```rust
    <Human as Wizard>::fly(&person);
```

These are actually all different examples of the same thing. The general syntax is `<Type as Trait>::function(receiver_if_method, next_arg, ...)`, but you can omit any part of this that Rust can work out on it's own.

## Using Supertraits to Require One Trait's Functionality Within Another Trait

Let's say we want to define a trait called `OutlinePrint`. Any type that implements `OutlinePrint` will have a method called `outline_print` that will print the value with a box made of `*`s around it:

```txt
**********
*        *
* (1, 3) *
*        *
**********
```

We can provide a default implementation of `outline_print`, but in order to do so we'd have to call into `self.fmt()`, which means that `self` has to implement `fmt:Display`.

We can write this trait like this:

```rust
use std::fmt;

trait OutlinePrint: fmt::Display {
    fn outline_print(&self) {
        let output = self.to_string();
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("*{}*", " ".repeat(len + 2));
        println!("* {} *", output);
        println!("*{}*", " ".repeat(len + 2));
        println!("{}", "*".repeat(len + 4));
    }
}
```

We say here that `fmt::Display` is a _supertrait_ of `OutlinePrint`. This is kind of like adding a trait bounds to `OutlinePrint` - saying that in order to implement OutlinePrint, your type also has to implement `fmt::Display`. It's also kind of like saying that `OutlinePrint` inherits from `fmt:Display` which is why we call it a supertrait (although you can't define `fmt` in the `impl` block for `OutlinePrint`, so it's not quite like OO style inheritance).

We can implement this on a `Point`:

```rust
use std::fmt;

struct Point {
    x: i32,
    y: i32,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// No need to implement the outline_print method as we get
// the default definition, which automatically calls into
// `fmt` above.
impl OutlinePrint for Point {}
```

## Using the Newtype Pattern to Implement External Traits on External Types

Back in [chapter 10](../ch10/ch10-02-traits.md#implementing-a-trait-on-a-type), we mentioned the "orphan rule". If you want to implement a trait on a type, then either the trait or the type (or both) need to be defined locally in your crate.

It's possible to get around this using the _newtype_ pattern (borrowed from Haskell). The basic idea is to create a tuple "wrapper" around the existing type. Let's suppose we want to implement `Display` on `Vec<T>`. These are both from the standard library, so normally we couldn't do this. We'll use the newtype pattern here:

```rust title="src/main.rs"
use std::fmt;

// Create a newtype wrapper around `Vec<String>`.
struct Wrapper(Vec<String>);

// Implement `Display` trait on the wrapper.
impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![String::from("hello"), String::from("world")]);
    println!("w = {}", w);
}
```

The disadvantage to this approach is that we have a new type `Wrapper` here, and we can't just treat `w` like we could a regular vector. Most of the methods we want to call on `Vec` aren't defined on Wrapper. We could redefine just the methods we want to call on `Wrapper` (which could ve an advantage if we want to present a subset of it's API as our API). We could also implement the `Deref` trait so we can treat a `w` like vector.
