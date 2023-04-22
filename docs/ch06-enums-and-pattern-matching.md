# 6 - Enums and Pattern Matching

## 6.1 - Defining an Enum

An _enum_ allows you to define a type by enumerating its possible _variants_. If you're coming from some other language, you probably think of an enum as basically a fancy way to assign names to a set of numbers. A Rust enum goes beyond this, as each variant of an enum can have some data associated with it, much like a struct.

```rust
// Define an enum.
enum IpAddrKind {
    V4,
    V6,
}

// Use one of the variants from the enum.
let ip_address_kind = IpAddrKind::V4;
```

`IpAddrKind::V4` and `IpAddrKind::V6` are both of type IpAddrKind.

We can also attach data to an enum:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(u8, u8, u8),
}

fn main() {
    let m1 = Message::Quit;
    let m2 = Message::Move { x: 7, y: 9 };
    let m3 = Message::Write(String::from("Hello"));
    let m4 = Message::ChangeColor(0, 255, 255);
}
```

Note that the different variants can take different types of associated data, and the data can either have named values like a struct or a set of values like a name tuple. Importantly though, all are of type `Message`.

We can also defined methods on an enum:

```rust
impl Message {
    fn call(&self) {
        // method body would be defined here
    }
}

let m = Message::Write(String::from("hello"));
m.call();
```

The `call` function here might use a match statement to perform different actions based on the variant of the Message enum.

### The `Option` Enum and Its Advantages Over Null Values

As mentioned earlier in this book, Rust has no `null` value. In most languages, you can dereference a null pointer, and it will cause your program to crash at runtime. Rust has a strong focus on safety and makes the conscious decision to not allow null pointers to exist in the first place.

However, sometimes we have a value that might not be defined. For example we might have a "middle_name" field on a User, but some users might not have a middle name. Rust handles this with the `Option` enum, defined by the standard library. `Option` is used frequently in Rust - so frequently that both `Option` and it's two variants are in the prelude, so you don't have to `use` it to bring it into scope.

`Option` is defined as:

```rust
enum Option<T> {
    None,
    Some(T),
}
```

The `<T>` means this is a generic enum - it can hold a value of any type. We'll talk more about generics in [chapter 10][chap10], but this is very similar to generics and template classes in other languages. When we use an `Option`, we have to specify a concrete type for `T` which defines a new type. For example, an `Option<i32>` can be `None`, or it can be `Some(i32)`.

```rust
// No need for `std::Options::Some`, or even `Option::Some`,
// because these are in the prelude.
let some_number = Some(5);
let some_str = Some("Hello");

// Need to explicitly annotate type here, since Rust
// can't automatically infer what type to use for
// `T` from `None`.
let absent_number: Option<i32> = None;
```

In this example `some_number` will be of type `Option<i32>`, and `some_str` will similarly be `Option<&str>`. The `None` case here is a bit like null in a traditional language. `None` serves as a marker that a value isn't present. We're not going to be able to use use an `Option<i32>` in place of a regular `i32` though:

```rust
let x = 7;
let y = Some(8);

// This will fail, since x and y are mismatched types
let z = x + y;
```

The difference between `Option` in Rust and null in other languages is that we can't just use an `Option`, we have to explicitly handle the case where the value might not be there. What we need is a way to convert an `Option<T>` into a `T`. If you have a look at [Option in the Rust Reference](https://doc.rust-lang.org/std/option/) you'll see that it has many methods defined on it that provide different ways to extract the underlying value from an Option, each with different ways of handling the case where the value is None.

```rust
let x = Some(8);

// If x is Some then use the value, otherwise panic.
let must_exist = x.expect("x should never be undefined here");

// Same as expect, but uses a generic message.
let must_exist_2 = x.unwrap();

// If x is Some use the value, otherwise
// if x is None use 9.
let with_default = x.unwrap_or(9);

// If x is Some use the value + 1, otherwise use 0.
// We'll talk about match more in the next section!
let from_match = match x {
    Some(v) => v + 1,
    None => 0
};
```

## 6.2 The `match` Control Flow Construct

`match` is a bit like a switch/case statement on steroids. Formally, a match consists of an expression, and then one or more "arms" with patterns that try to match the expression. The pattern for each arm is evaluated in order, and the code associated with the first arm that matches will be executed. The pattern side is quite a bit more flexible than a switch/case statement (see [chapter 18][chap18]). One thing to note about a match expression is that the patterns must cover every possible value - they must be _exhaustive_. If there are any possibly-unhandled-values, the compiler will error.

Here's an example of a match expression, taken directly from the original Rust Book:

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

### Patterns That Bind to Values

A match expression can bind to parts of values that match the pattern. This can be used to extract one or more values out of an enum. We saw a quick example of this when handling `Option`s in the previous section:

```rust
let x = Some(7);

let from_match = match x {
    Some(v) => v + 1,
    None => 0
};
```

Here `v` gets bound to the contents of `Some`. Let's see this in action with our coin example from before. Let's change the Quarter variant of the Coin enum so it tells us which Canadian province this quarter is from:

```rust
#[derive(Debug)] // so we can inspect the state in a minute
enum Province {
    Alberta,
    BritishColumbia,
    // --snip--
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(Province),
    Loonie,
    Toonie,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(province) => {
            println!("Quarter from {:?}!", province);
            25
        }
        Loonie => 100,
        Toonie => 200,
    }
}
```

Each arm of the match can have a simple expression, or a block of code. As with functions, if the block ends with an expression this will be used as the value for that arm. If we were to call this with a `Coin::Quarter(Province::Ontario)`, then in the Quarter arm of the match, `province` would be bound to `Province::Ontario`.

Let's take a moment here to reflect on ownership implications. In this case, the Province enum implements the Copy trait, so we don't have to worry about ownership as the Province enum is going to be allocated on the stack. If we change the Coin enum so it is `Quarter(String)` however, then binding `province` inside the match would move ownership of the String out of the coin and we wouldn't be able to use it again outside the match! We could fix this by borrowing the value instead, either by changing the match expression to `match &coin` or to make `value_in_cents` take a reference to the Coin as a parameter instead of the Coin itself.

### Catch-all Patterns and the \_ Placeholder

A match expression must be exhaustive - it has to cover all possible cases. Sometimes we have a number of cases we want to treat the same way, or enumerating all cases would be impractical. If we wrote a match and passed in an `i32` as the expression, we certainly wouldn't want to write out all 4 billion possible values the i32 could be! The catch-all pattern lets us create a default arm (similar to `default` in a switch/case statement in many languages).

The example used by the original Rust Book is that you're building a board game where a player rolls a dice. On a roll of a 3, the place gets a hat. On a 7, the player loses their hat. On any other dice roll, they move that many spaces:

```rust
let dice_roll = 9;
match dice_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    other => move_player(other),
}
```

Here we have explicit arms for the 3 and 7 case, and then we have a catch-all pattern that binds the value of `dice_roll` to `other`. If we didn't actually want to _use_ the value in the catch-all case, we wouldn't want to bind the value to a variable, since we'd get a warning from the compiler about an unused variable. In this case, we can replace `other` with `_`:

```rust
match dice_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    _ => (),
}
```

Here we're making this arm evaluate to the empty unit tuple, explicitly telling Rust that we don't want to do anything in this case. (Note that unlike `other`, `_` also doesn't bind the variable, which has ownership implications! See [chapter 18](./ch18-patterns-and-matching.md#ignoring-an-unused-variable-by-starting-its-name-with-_).

## 6.3 - Concise Control Flow with `if let`

On other languages you can convert a switch/case statement into a series of if/else statements. You can do the same in Rust. You could write:

```rust
    let config_max = Some(3u8);
    match config_max {
        Some(max) => println!("The maximum is configured to be {}", max),
        _ => (),
    }
```

But this is a bit verbose, considering the default arm does nothing. We can rewrite this as an if statement with `if let`:

```rust
let config_max = Some(3u8);
if let Some(max) = config_max {
    println!("The maximum is configured to be {}", max);
}
```

`if let` takes a pattern and an expression, separated by an equals sign, and works exactly like the arm of a switch. The downside to `if let` over a `match` statement is that the compiler does not force you to exhaustively handle every possible scenario.

Continue to [chapter 7][chap7].

[chap7]: ./ch07-packages-crates-modules.md "Chapter 7: Managing Growing Projects with Packages, Crates, and Modules"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap18]: ./ch18-patterns-and-matching.md "Chapter 18: Patterns and Matching"
