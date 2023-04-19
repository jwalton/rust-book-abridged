# 18 - Patterns and Matching

## 18.1 - All the Places Patterns Can Be Used

We've already talked about using patterns in `match` and `if let` expressions, but actually patterns are everywhere in Rust.  A destructuring assignment is actually an example of a pattern.

### `match` Arms

As seen in [chapter 6][chap6], the arms of a `match` use patterns:

```txt
match VALUE {
    PATTERN => EXPRESSION,
    PATTERN => EXPRESSION,
    PATTERN => EXPRESSION,
}
```

The patterns in a `match` need to be _exhaustive_ - they need to cover every possibility.  The `_` pattern will match anything and not bind to a variable, so it will often be used as a catch-all at the end of a `match`.

In this example, we extract a value from a `Some`.  Note that value we extract shadows the outer variable:

```rust
match i {
    None => None,
    Some(i) => Some(i + 1),
}
```

### Conditional `if let` Expressions

In [chapter 6][chap6] we also so how to use an `if let` expression.  These use patterns just like a `match`, but they don't have to be exhaustive (which can be an advantage or a disadvantage, depending on the situation) and we can mix patterns with different values.  This example uses a number of different inputs to decide what color to use as a background color:

```rust
fn main() {
    let favorite_color: Option<&str> = None;
    let is_tuesday = false;
    let age: Result<u8, _> = "34".parse();

    if let Some(color) = favorite_color {
        println!("Using your favorite color, {color}, as the background");
    } else if is_tuesday {
        println!("Tuesday is green day!");
    } else if let Ok(age) = age {
        if age > 30 {
            println!("Using purple as the background color");
        } else {
            println!("Using orange as the background color");
        }
    } else {
        println!("Using blue as the background color");
    }
}
```

Note in this example we used `let Ok(age) = age` to create a shadowed variable for `age`, similar to what we did in our `match` example above.

### `while let` Conditional Loops

We can create a `while let` loop, which is very similar to the `if let` syntax:

```rust
    let mut stack = Vec::new();

    stack.push(1);
    stack.push(2);
    stack.push(3);

    // This prints 3, 2, then 1.  When `pop`
    // returns `None`, this loop will stop.
    while let Some(top) = stack.pop() {
        println!("{}", top);
    }
```

### `for` Loops

In a `for` loop, the bit immediately after the `for` keyword is actually a pattern!  We can use this to destructure values from an iterator:

```rust
    let v = vec!['a', 'b', 'c'];

    for (index, value) in v.iter().enumerate() {
        println!("{} is at index {}", value, index);
    }
```

### `let` statements

Simple let statements actually use patterns too:

```rust
let x = 5;
```

`x` here is a pattern, albeit a very boring one.  Using it here is similar to using `x` as a pattern in a `match`.  The fact that this is a pattern is what makes it possible to do destructuring assignment in Rust:

```rust
let (x, y, z) = (1, 2, 3);
```

### Function and Closure Parameters

Similar to `let`, the parameters of a function are also patterns.  We can use this to destructure a tuple or struct in a function declaration:

```rust
fn print_coordinates(&(x, y): &(i32, i32)) {
    println!("Current location: ({}, {})", x, y);
}

fn main() {
    let point = (3, 5);
    print_coordinates(&point);
}
```

## 18.2 - Refutability: Whether a Pattern Might Fail to Match

In this example:

```rust
match i {
    None => None,
    Some(1) => Some(2),
    x => Some(x + 2),
}
```

`Some(1)` and `None` are examples of _refutable_ patterns.  Either of these patterns, taken alone, might or might not match `i`.  `x` is an example of an _irrefutable_ pattern.  `x` will always match, no matter what.

There are some places where we're only allowed to use irrefutable patterns.  For example, consider the statement:

```rust
let Some(x) = value;
```

Here if `value` is `Some(1)`, then we expect `x` to get the value 1.  But if `value` were `None`, what would `x` be here?  This statement makes no sense, and will result in a compiler error, because `let` needs an irrefutable pattern.  (Although we could fix this with an `if let` instead.)

There are also places where an irrefutable parameter is allowed, but is somewhat pointless, which will generate compiler warnings, such as this:

```rust
if let x = 5 {
    println!("{}", x);
}
```

This is technically valid Rust code, but there aren't any good reasons to write something like this, so this is probably a mistake.

## 18.3 - Pattern Syntax

### Matching Literals

```rust
let x = 1;

match x {
    1 => println!("one"),
    2 => println!("two"),
    3 => println!("three"),
    _ => println!("anything"),
}
```

### Matching Named Variables

Named variables are irrefutable patterns that match any value:

```rust
let x = Some(5);
let y = 10;

match x {
    Some(50) => println!("Got 50"),
    y => println!("Matched, y = {y}"),
}

println!("at the end: x = {:?}, y = {y}", x);
```

Here `y` will match any value.  Note that `y` does _not_ match only `10` here.

### Multiple Patterns

You can match more than one value with the `|` "or operator", or with a range expression:

```rust
let x = 1;

match x {
    1 | 2 => println!("one or two"),
    3..=5 => println!("three, four, or five"),
    _ => println!("anything"),
}
```

### Destructuring to Break Apart Values

We can destructure a struct or tuple with a pattern:

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    // Can rename the values when we destructure:
    let Point { x: a, y: b } = p;
    assert_eq!(0, a);
    assert_eq!(7, b);

    // Or not:
    let Point { x, y } = p;
    assert_eq!(0, x);
    assert_eq!(7, y);
}
```

We can also destructure with literal values as part of a pattern.  The first two arms of this `match` only match when `y` is 0 or `x` is 0, respectively:

```rust
fn main() {
    let p = Point { x: 0, y: 7 };

    match p {
        Point { x, y: 0 } => println!("On the x axis at {x}"),
        Point { x: 0, y } => println!("On the y axis at {y}"),
        Point { x, y } => {
            println!("On neither axis: ({x}, {y})");
        }
    }
}
```

We've seen examples already of destructuring enums:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

fn main() {
    let msg = Message::ChangeColor(0, 160, 255);

    match msg {
        Message::Quit => {
            println!("The Quit variant has no data to destructure.");
        }
        Message::Move { x, y } => {
            println!("Move in the x direction {x} and in the y direction {y}");
        }
        Message::Write(text) => {
            println!("Text message: {text}");
        }
        Message::ChangeColor(r, g, b) => {
            println!("Change the color to red {r}, green {g}, and blue {b}",)
        }
    }
}
```

We can even destructure nested fields out of an enum:

```rust
enum Color {
    Rgb(i32, i32, i32),
    Hsv(i32, i32, i32),
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(Color),
}

fn main() {
    let msg = Message::ChangeColor(Color::Hsv(0, 160, 255));

    match msg {
        Message::ChangeColor(Color::Rgb(r, g, b)) => {
            println!("Change color to red {r}, green {g}, and blue {b}");
        }
        Message::ChangeColor(Color::Hsv(h, s, v)) => {
            println!("Change color to hue {h}, saturation {s}, value {v}")
        }
        _ => (),
    }
}
```

And we can mix-and-match destructuring nested structs and tuples:

```rust
let ((feet, inches), Point { x, y }) = ((3, 10), Point { x: 3, y: -10 });
```

### Ignoring Values in a Pattern

We can ignore an entire value in a pattern with `_`.  We've seen this as a catch-all in a `match`, but we can also use it to ignore a parameter in a function:

```rust
fn foo(_: i32, y: i32) {
    println!("This code only uses the y parameter: {}", y);
}

fn main() {
    foo(3, 4);
}
```

This can be useful when you need to implement a certain function signature in order to match the definition in a trait.  We can also use `_` to ignore parts of a value:

```rust
let mut setting_value = Some(5);
let new_setting_value = Some(10);

match (setting_value, new_setting_value) {
    (Some(_), Some(_)) => {
        println!("Can't overwrite an existing customized value");
    }
    _ => {
        setting_value = new_setting_value;
    }
}

println!("setting is {:?}", setting_value);
```

Or part of a destructuring assignment:

```rust
let numbers = (2, 4, 8, 16, 32);

match numbers {
    (first, _, third, _, fifth) => {
        println!("Some numbers: {first}, {third}, {fifth}")
    }
}
```

## Ignoring an Unused Variable by Starting Its Name with `_`

We can prefix an unused variable name with an `_` to avoid a compiler warning:

```rust
fn main() {
    let _x = 5;
}
```

There is one big difference between `_` and `_x`: `_x` will still bind the variable, where `_` will not.  This can be important when we consider ownership:

```rust
let s = Some(String::from("Hello!"));

if let Some(_s) = s {
    println!("found a string");
}

// `s` was moved into `_s` above, so
// this won't compile!
println!("{:?}", s);
```

If we used `if let Some(_)` here, this would have worked.

### Ignoring Remaining Parts of a Value with `..`

We can ignore part of a tuple or struct with `..`:

```rust
struct Point {
    x: i32,
    y: i32,
    z: i32,
}

let origin = Point { x: 0, y: 0, z: 0 };

// Ignore the `y` and `z` members
match origin {
    Point { x, .. } => println!("x is {}", x),
}

let numbers = (2, 4, 8, 16, 32);

// Ignore all but the first and last numbers
match numbers {
    (first, .., last) => {
        println!("Some numbers: {first}, {last}");
    }
}
```

### Extra Conditionals with Match Guards

A _match guard_ is an additional `if` condition attached to a pattern:

```rust
let num = Some(4);

match num {
    Some(x) if x % 2 == 0 => println!("The number {} is even", x),
    Some(x) => println!("The number {} is odd", x),
    None => (),
}
```

A match guard applies to the entire pattern:

```rust
let x = 4;
let y = false;

match x {
    4 | 5 | 6 if y => println!("yes"),
    _ => println!("no"),
}
```

Here if `y` is true, the first arm will match `4 | 5 | 6`.  If `y` is false, the first arm will never match.  It's `(4 | 5 | 6) if y`, not `4 | 5 | (6 if y)`.

One downside to match guards is that they generally require the match to have a catch-all at the end.  You and I might know that this `match` is exhaustive:

```rust
match x {
    Some(x) if y => println!("{x}"),
    Some(x) if !y => println!("{x}"),
    None => println!("no"),
}
```

But unfortunately the compiler isn't smart enough to figure this out.

### `@` Bindings

Sometimes we want to test a value as part of a pattern, and also assign that value to a variable.  We can do this with the _at_ operator:

```rust
enum Message {
    Hello { id: i32 },
}

let msg = Message::Hello { id: 5 };

match msg {
    Message::Hello {
        id: id_variable @ 3..=7,
    } => println!("Found an id in range: {}", id_variable),
    Message::Hello { id: 10..=12 } => {
        println!("Found an id in another range")
    }
    Message::Hello { id } => println!("Found some other id: {}", id),
}
```

Continue to [chapter 19][chap19].

[chap6]: ./ch06-enums-and-pattern-matching.md "Chapter 6: Enums and Pattern Matching"
[chap19]: ./ch19/ch19-01-unsafe.md "Chapter 19: Advanced Features"
