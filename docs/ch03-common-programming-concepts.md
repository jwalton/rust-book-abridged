# 3 - Common Programming Concepts

In which we learn about variables, basic types, functions, comments, and control flow.

## 3.1 - Variables and Mutability

By default, variables are immutable. This program will fail to compile with the error `` cannot assign twice to immutable variable `x`  ``:

```rust
fn main() {
    let x = 5;
    println!("The value of x is: {x}");
    x = 6; // This will error!
    println!("The value of x is: {x}");
}
```

This is similar to `const` in JavaScript, or `final` in Java, although in Rust it also means the contents of the variable can't be modified either:

```rust
fn main() {
    let foo = String::from("foo");
    foo.clear(); // This will error!
}
```

Here `clear` will try to empty the string, but will fail with the error `` cannot borrow `foo` as mutable, as it is not declared as mutable ``. This is because the `clear` method is defined as requiring `self` to be mutable.

As we saw in the [previous chapter][chap2], we can declare a variable as mutable with the `mut` keyword:

```rust
fn main() {
    let mut x = 5;
    println!("The value of x is: {x}");
    x = 6; // This works!
    println!("The value of x is: {x}");
}
```

### Constants

Rust also has the concept of a _constant_ which at first sounds a lot like an immutable variable:

```rust
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;
```

Constants are stored directly in the program binary, and have a few restrictions placed on them. First, constants can't be declared `mut` for hopefully obvious reasons. Second, the type of the constant must always be annotated (here we declare that this const is a u32). Third, constants can be declared in the global scope, where variables cannot be.

The value of the constant has to be something that can be determined at compile time, not at runtime. The Rust Reference has a [section on constant evaluation](https://doc.rust-lang.org/stable/reference/const_eval.html) that lays out all the rules for what operators you're allowed to use and what you're not, but here the compiler can convert `60 * 60 * 3` into `10800` for us and store that in the executable.

### Shadowing

As we saw in [chapter 2][chap2], a variable declaration can shadow another:

```rust
fn main() {
    let x = 5;

    let x = x + 1;

    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {x}");
    }

    println!("The value of x is: {x}");
}
```

There are a total of three variables in this function, all named "x". Variables last until the end of the block they were declared in, so this program prints out:

```txt
The value of x in the inner scope is: 12
The value of x is: 6
```

When shadowing a variable, the new variable does not have to have the same type as the one it is shadowing.

## 3.2 - Data Types

Rust is a statically typed language, so the type of every variable (and how much space it will occupy in memory) must be known at compile time.

A "scalar type" represents a single value. There are four kinds of scalar types in Rust: integers, floating-point numbers, Booleans, and characters.

### Integer Types

Integer types:

| Length (bits) | Signed | Unsigned |
| ------------- | ------ | -------- |
| 8             | i8     | u8       |
| 16            | i16    | u16      |
| 32            | i32    | u32      |
| 64            | i64    | u64      |
| 128           | i128   | u128     |
| arch          | isize  | usize    |

Signed integers are stored using [two's complement](https://en.wikipedia.org/wiki/Two%27s_complement). `isize` and `usize` depend on your architecture, so they'll be 32 bit numbers on a 32 bit architecture, or 64 bit on a 64 bit architecture.

Integer literals can be written using any of the methods below. Integer literals in Rust can use an `_` as a visual separator (similar to how we might write "1,000" in English, we can write "1_000" in Rust).

| Number literals | Example     |
| --------------- | ----------- |
| Decimal         | 98_222      |
| Hex             | 0xff        |
| Octal           | Oo77        |
| Binary          | 0b1111_0000 |
| Byte (u8)       | b'A'        |

If you try to overflow an integer (e.g. you try to store 256 in a u8), what happens depends on whether you compiled your program with `--release` or not. In debug mode Rust adds runtime checks to ensure you don't overflow a value, so your program will panic and crash (see [chapter 9][chap9] for more about panics). With the --release flag, the integer will overflow as you would expect it to in another language like C or Java (the largest value a u8 can hold is 255, so 256 wraps to 0).

The standard library has functions that let you explicitly define how you want to handle overflows if you don't want to panic. For example [`wrapping_add`](https://doc.rust-lang.org/std/intrinsics/fn.wrapping_add.html) will add two numbers and let them wrap around. There are `wrapping_*`, `checked_*`, `overflowing_*`, and `saturating_*` functions for integer arithmetic.

### Floating-Point Types

There are two floating point types, `f64` (the default) and `f32`. Floating-point numbers are stored using the IEEE-754 standard.

### Number Operators

Rust has the operators you'd expect: `+`, `-`, `*`, `/`, and `%` for modulus. See [the Rust Book Appendix B][appb] for a complete list of all the operators in Rust.

### Boolean type

Booleans are of type `bool` and can be `true` or `false`:

```rust
let t = true;
let f: bool = false;
```

### Character Type

A `char` in Rust is a four-byte unicode code point.

```rust
let c = 'z';
let z: char = 'ℤ';
let heart_eyed_cat = '😻';
// This doesn't work since this is a single glyph made up of multiple
// unicode codepoints joined with zero-width-joins.
// See chapter 8.
let space_woman_zwj = '👩🏻‍🚀';
```

### `str` and String

You'll see two different string types in Rus: `str` and `String`. str is to an array as String is to a Vector. Any string literal in Rust is a `&str` (it's size is known at compile time, and it can't be modified). `&str` is also often called a _string slice_ which we'll learn more about in [the next chapter][chap4].

A `String` is always stored on the heap and (assuming it's stored in a mutable variable) can be modified. Any string you read from a file or from stdin is going to end up as a `String`.

## Compound Types

Compound types group multiple values into one type. Rust has two primitive compound types, the _tuple_ and the _array_.

### Tuple Type

```rust
let tup: (i32, f64, u8) = (800, 6.4, 1);

// Destructuring assignment
let (x, y, z) = tup;

// Access individual elements
let a = tup.0;
let b = tup.1;
let c = tup.2;
```

An empty tuple is written `()` and is called a "unit". This represents an empty value or an empty return type. Functions without a return type implicitly return this.

### Array Type

Every element in an array must be the same type, and arrays must be fixed length. If you're looking for a "variable length" array, you want a vector from the standard library (see [Chapter 8][chap8]). Note that arrays end up on the stack, where vectors store their contents on the heap.

```rust
let a = [1, 2, 3, 4, 5];

// Destructuring assignment.  Must use all elements!
let [x, y, z, _, _] = a;

// Access individual elements
let first = a[0];
let second = a[1];

// Create array of type i32, length 5.
let b: [i32; 5] = [1, 2, 3, 4, 5];

// Create array of five zeros.
let c = [0; 5]
```

Array accesses are checked at runtime. Trying to access an index which is out-of-bounds will cause a panic.

If you're coming to Rust from JavaScript, it's worth pointing out that JavaScript "arrays" are not quite like arrays in any other programming language. The Rust `Vec` type, or _vector_, is much closer to a JavaScript array than a Rust array is. We'll talk about vectors in [chapter 8][chap8].

## 3.3 - Functions

Functions are defined by `fn` keyword. Parameters are required to have a type annotation, and are annotated with `: type` just like variables (and just like in Typescript).

```rust
fn another_function(x: i32, y: i32) {
    println!("The point is at: {x}, {y}");
}
```

If you end a function with an expression instead of a statement, then the function will return the value of that expression. Return types must be explicitly declared with an arrow (`->`).

```rust
// Returns 1
fn implicit_return() -> i32 {
    1
}

// Also returns 1, but this is not idiomatic in
// Rust unless you want to return from the middle
// of a function.
fn explicit_return() -> i32 {
    return 1;
}

// The semicolon makes this a statement instead
// of an expression, so this returns `()`.
fn no_return() {
    1;
}
```

Assignments are always statements (i.e. `let x = 6` does not evaluate to 6), as are function definitions (i.e. you can't do `let x = fn foo() {}` - although you can do this with closures - see [chapter 13][chap13]). Functions can be called before they are defined. See [chapter 10][chap10] to learn about generic functions.

## 3.4 - Comments

```rust
// This is a comment.  Multi-line comments
// generally are written this way.

/* You can use this style of comment too. */

/// This is a doc comment - see chapter 14.
```

## 3.5 - Control Flow

### if Expression

`if` statements don't have braces around the condition, (much like Go, and much unlike Java, JavaScript, or C):

```rust
if number < 5 {
    println!("less than 5");
} else if number > 10 {
    println!("greater than 10");
} else {
    println!("greater than 4, less than 11");
}
```

Note that `if` can be used as an expression. In this case each "arm" of the if must be the same type:

```rust
// This is OK
let number = if condition { 5 } else { 6 };

// This breaks! `if` and `else` have
// incompatible types
let wat = if condition { 5 } else { "six" };
```

### Repetition with Loops

Rust has three kinds of loops: `loop`, `while`, and `for`. The `break` and `continue` statements work exactly as they do in other languages: `break` will stop the loop, and `continue` will stop execution of the current iteration and start the next one. Note that loops can be used as expressions.

```rust
loop {
    println!("Infinite loop!")
}

// Loops can be used as expressions, with `break`
// returning the value from the block.
let mut counter = 0;
let x = loop {
    counter += 1;
    if counter == 10 {
        break counter * 2;
    }
};

// Loops can be labeled with a single quote
// followed by the label and the a colon.
'outer: loop {
    'inner: loop {
        break 'outer;
    }
}

// A while loop looks a lot like a
// while loop in every other language.
let mut number = 0;
while number < 10 {
    number++;
}
```

For loops in Rust are always of the format `for [var] in [iterator] {}`:

```rust
// Iterate over an array
let a = [1, 2, 3, 4, 5];
for element in a {
    println!("value is {element}");
}

// Count from 1 to 5
for element in (1..6) {
    println!("value is {element}");
}
```

We'll see more about iterators in [chapter 13][chap13].

Continue to [chapter 4][chap4].

[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"
[chap4]: ./ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap8]: ./ch08-common-collections.md "Chapter 8: Common Collections"
[chap9]: ./ch09-error-handling.md "Chapter 9: Error Handling"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap13]: ./ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
[appb]: ./zz-appendix/appendix-02-operators.md
