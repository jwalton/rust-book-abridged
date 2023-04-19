# 19.3 - Advanced Types

## Using the Newtype Pattern for Type Safety and Abstraction

In the [previous section](./ch19-02-advanced-traits.md#using-the-newtype-pattern-to-implement-external-traits-on-external-types), we discussed using the _newtype_ pattern to wrap an existing type in a tuple.

The newtype pattern is useful in a few other scenarios too. If we create a `Millimeter` type:

```rust
struct Millisecond(u32);

fn sleep(duration: Millisecond) {
    // --snip--
}
```

It makes it very clear that `sleep` expects a value in milliseconds. The newtype pattern can also be used to wrap a type and give it a different public API, or to give a nicer API to a data structure.

## Creating Type Synonyms with Type Aliases

We can give an existing type a _type alias_:

```rust
type Kilometers = i32;

let x: i32 = 5;
let y: Kilometers = 5;

println!("x + y = {}", x + y);
```

This creates a new type called `Kilometers` which is an alias for i32. You can now use these types interchangeably - if a function expects a `Kilometers` you can pass in an i32 instead or vice versa.

The main use case for type aliases is to reduce the length of long type names. We can take code like this:

```rust
let f: Box<dyn Fn() + Send + 'static> = Box::new(|| println!("hi"));

fn takes_long_type(f: Box<dyn Fn() + Send + 'static>) {
    // --snip--
}

fn returns_long_type() -> Box<dyn Fn() + Send + 'static> {
    // --snip--
}
```

and turn it into:

```rust
type Thunk = Box<dyn Fn() + Send + 'static>;

let f: Thunk = Box::new(|| println!("hi"));

fn takes_long_type(f: Thunk) {
    // --snip--
}

fn returns_long_type() -> Thunk {
    // --snip--
}
```

A meaningful name for your alias can make your code much easier to read and write.

Another example of this is in `std::io`. Many functions here return a `Result` with a `std::io::Error` as the error type, so `std:io` defines:

```rust
type Result<T> = std::result::Result<T, std::io::Error>;
```

which shortens up a lot of code in this module.

## The Never Type that Never Returns

There's a special type named `!`. This is the _empty type_ or _never type_:

```rust
fn bar() -> ! {
    // --snip--
}
```

Here this tells the compiler that the `bar` function will never return. Way back in [chapter 2][chap2] we wrote this code:

```rust
loop {
    // --snip--
    let guess: u32 = match guess.trim().parse() {
        Ok(num) => num,
        Err(_) => continue,
    };
    // --snip--
}
```

The arms of a `match` are supposed to all be of the same type in order for it to compile. You can't have one arm evaluate to a `u32` and another evaluate to a `String`. Here though, we know that the `Err(_)` arm isn't going to return anything - if we get here, we'll abort this run through the loop and continue. From a type perspective, the return value of `continue` is `!`, so here Rust knows it's safe to ignore this arm (or to put it another way, the `!` type can be coerced to any other type).

The `panic!` macro is another example of something that evaluates to the `!` type:

```rust
impl<T> Option<T> {
    pub fn unwrap(self) -> T {
        match self {
            Some(val) => val,
            None => panic!("called `Option::unwrap()` on a `None` value"),
        }
    }
}
```

A `loop` without a `break` is also of type `!`.

## Dynamically Sized Types and the Sized Trait

When we create a variable on the stack, Rust needs to know how much space to allocate for that variable at compile time. For example:

```rust
fn add(a: i32, b: i32) {
    println!("{}", a + b);
}
```

When someone calls `add`, Rust will need to allocate four bytes on the stack to hold `a`, and another four to hold `b`.

Consider a string, which holds a variable amount of data:

```rust
fn say_hello(name: &str) {
    println!("Hello {name}");
}
```

Here `name` isn't actually a `str` but a `&str` or a string slice. The actual data from the string is stored somewhere on the heap (or if it's a string literal somewhere in the application binary), but the `name` variable itself is 16 bytes long on a 64-bit platform (two `usize`s). This is because `&str` is implemented as a pointer to the string data and a length value.

As a rule, to pass around _dynamically sized types_ like a string, we need a pointer. This can be a `Box` or an `Rc` or a `&`, but some kind of pointer. Another example of a dynamically sized type is a trait object, which is why when we pass one it's usually in a `Box<dyn Trait>`. The size of the trait object itself is unknown, so we pass around a smart pointer to the trait object instead, allowing us to store the trait object on the heap.

Any type whose size is known at compile time automatically implements the `Sized` trait. Generic functions implicitly get a trait bounds for `Sized`:

```rust
// You write this:
fn my_generic_fn<T>(t: T) {
    // --snip--
}

// But Rust implicitly turns this into:
fn my_generic_fn<T: Sized>(t: T) {
    // --snip--
}
```

You can prevent this with this syntax:

```rust
// T doesn't have to be `Sized`.
fn generic<T: ?Sized>(t: &T) {
    // --snip--
}
```

Note that in order to do this, we can't leave the `t` parameter of type `T`. We again need some kind of pointer, in this case we chose `&T`.

[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"
