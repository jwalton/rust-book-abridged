# 4 - Ownership, References, and Slices

> Ownership is Rust's most unique feature and has deep implications for the rest of the language. It enables Rust to make memory safety guarantees without needing a garbage collector, so it's important to understand how ownership works.

-- ["The Rust Programming Language" Chapter 4 - Understanding Ownership](https://doc.rust-lang.org/stable/book/ch04-00-understanding-ownership.html)

## 4.1 - What is Ownership?

The idea of ownership is quite core to Rust. If you're coming from a language like Python or JavaScript, and you're not familiar with the idea of the [the stack and heap](https://www.geeksforgeeks.org/stack-vs-heap-memory-allocation/) it's worth reading up about them. We're going to assume you're familiar with them in this chapter.

In a language like C, we can manage memory by explicitly calling `malloc` and `free`. All memory management is up to us, which means it's easy to make mistakes. In a language like Java or JavaScript, memory is allocated automatically without us having to think about it, so memory allocation is very safe, but this incurs a runtime cost in the form of garbage collection.

Rust is rather unique in how it manages memory. Aside from simple values such as `i32` or `f64`, In Rust, every value is _owned_ by some variable called the _owner_. Ownership of a particular value can be transferred from one variable to another, and in some cases memory can be _borrowed_. Once the variable that owns the value is no longer around we say that value has been _dropped_, and once that happens any memory it allocated can safely be freed. When a value is dropped, it can optionally run code in a _destructor_ (defined by implementing the `Drop` trait).

### Ownership Rules

From the original Rust Book:

- Each value in Rust has an owner.
- There can only be one owner at a time.
- When the owner goes out of scope, the value will be _dropped_.

The _scope_ of a variable in Rust works much like it does in most other languages - inside a set of curly braces, any variable you declare can be accessed only after its declaration, and it goes "out of scope" once we hit the closing brace. The key thing about Rust is that once a variable goes out of scope, if that variable currently owns some memory, then that memory will be freed.

:::tip

A variable can only have one owner at a time, but in [chapter 15][chap15] we'll talk about smart pointers like `Rc<T>` that let us get around this restriction.

We also say that each value in Rust has an owner, but it's possible to [leak memory](./ch15-smart-pointers.md#156---reference-cycles-can-leak-memory) in Rust, which would technically end with values that have no owners.

:::

### Memory and Allocation

This is a trivial example demonstrating some memory being allocated on the heap and then freed:

```rust
fn foo() {

    if (true) {
        // Create the variable `s` to own a String.
        // Remember that Strings can store an arbitrary
        // length of data, so this will allocate memory
        // on the heap.
        let s = String::from("hello");

        // Do stuff with s

    }
    // At this point `s` has fallen out of scope, so the
    // String that was owned by s will be dropped, and
    // the memory it allocated on the heap will be freed.
}
```

You might read that and scratch your head and think "If everything disappears when it goes out of scope, isn't this the same as just allocating everything on the stack?" And this _would_ be true, except that ownership can be _moved_:

```rust
fn main() {
    let outer_string = foo();
    println!("{}", outer_string);
}

fn foo() -> String {
    let inner_string = String::from("hello world");
    inner_string
}
```

Here the `foo` function creates a `String` (which allocates some memory on the heap) and `inner_string` is the owner of that `String`. The `foo` function returns `inner_string`, so ownership of the String (and the associated memory) is moved to `outer_string` in the caller. When we reach the end of `main`, then `outer_string` falls out-of-scope. At this point the `String` doesn't have an owner anymore, so it will be dropped.

:::info

When we move ownership of a variable, it's location in memory will change:

```rust
fn main() {
    let x = String::from("hello world");
    println!("Address: {:p}", &x);
    let y = x;
    println!("Address: {:p}", &y);
}
```

The above example will print different addresses for `x` and `y`. In this example, the `String` has some memory stored on the heap (the "hello world" part) but also has some memory on the stack (a pointer to that value and a length, amongst other data). When we move ownership of `x` to `y`, we're also moving the data on the stack from one place to another with `memcpy`, although the heap part stays in the same place.

If you need a piece of data to stay in one place in memory, see [`std::pin`](https://doc.rust-lang.org/std/pin/index.html).

:::

### There Can Only Be One

Remember that we said there can only be one owner at a time?

```rust
fn strings() -> String {
    // Create a string
    let s1 = String::from("hello");

    // Move ownership from s1 to s2
    let s2 = s1;

    // Can't use s1 anymore!
    println!("{}", s1);

    s2
}
```

This code fails to compile with the error:

```txt
error[E0382]: borrow of moved value: `s1`
 --> src/main.rs:9:20
  |
3 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
...
6 |     let s2 = s1;
  |              -- value moved here
...
9 |     println!("{}", s1);
  |                    ^^ value borrowed here after move
```

If you're coming from some other language, and you try to just pass values around and hope for the best without understanding ownership, you're going to see this error a lot.

In this example, we create a variable `s1`, which owns the String. In most other languages, when we do `let s2 = s1;`, we'd now have two variables that point to the same underlying object, but not so in Rust. In Rust, we _move_ ownership of the value from `s1` to `s2`, so `s1` stops being valid and can't be used from that point forwards. This is exactly the same as when we returned a variable in the example above.

If you think about this at the memory level, when we create `s1`, we allocate some memory. When we say `let s2 = s1;`, we're not creating a second `String` (we didn't call `clone` or `new`). If we allowed `s1` to be valid after this point then `s1` and `s2` would have to point to the same memory. When we reach the end of the function, we return `s2` but not `s1`, which means `s1` is going out of scope and should be dropped, but since `s2` is being moved and refers to the same underlying object `s1` can't be dropped. Rust's answer to this problem is to never let this happen - only one owner at a time.

If we wanted to deep-copy the data in the String, we could use the `clone` method to allocate more memory on the heap:

```rust
fn strings() {
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("{}", s1);
}
```

:::info

We can do something slightly tricky with a move like this too. We can take an immutable variable and turn it into a mutable one:

```rust
fn main() {
    let x = String::from("hello world");
    let mut y = x;
}
```

When `y` takes ownership of `x`, it owns that memory now and can do what it wants with it, so it's perfectly acceptable to redeclare the variable as `mut`. If you have a favorite book and you keep it in pristine condition, but then you decide to give me that book then it becomes my book. I can dog ear pages and crack the spine, because I own it. If you lend me your book, that's a different story - and we'll talk about borrowing in just a little bit.

:::

### Stack-Only Data: Copy

Similar to Java or JavaScript or C or... actually most other languages, Rust has special handling for basic data types:

```rust
fn integers() {
    let i1 = 1;
    let i2 = i1;

    println!("{}", i1);
}
```

This looks just like the string example above, but it compiles. This is because here `i1` is an `i32`, which takes up four bytes of memory. Since Rust knows this at compile time, it can allocate it on the stack instead of the heap, and making a copy of a four byte value on the stack to another four bytes of the stack is so cheap it is essentially free. So here, `let i2 = i1;` doesn't move anything, it just makes a copy of the variable for you.

What types get copied like this? The quick answer to this is any basic type (integers, booleans, chars, etc...) and any tuple made up of basic types. More formally, the answer is any type that has the `Copy` trait (see [chapter 10][chap10] for more information about traits). You can also implement it on your own data structures if they are made entirely of copyable types, or get Rust to _derive_ it for you (which means Rust will generate this code for you at compile time):

```rust
#[derive(Copy, Clone)]
pub struct MyStruct {
    pub foo: i32,
}
```

:::info

Structs with the `Copy` trait are not allowed to implement the `Drop` trait, so they can't run any custom code when they go out of scope.

:::

### Ownership and Functions

We already saw that if you return a variable, then ownership of the variable is moved to the caller. We also move ownership when we pass a variable to a function:

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s);

    // Ownership of `s` was moved to `takes_ownership`'s
    // `some_string`, so s is no longer valid here.
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // Here, some_string goes out of scope and `drop`
  // is called. The backing memory is freed.
```

## 4.2 - References and Borrowing

If you wanted to pass a variable to a function, but also keep it usable afterwards, you could pass the variable to the function and then return it from the function. This would move the variable into the function, and then move it back so you can keep using it. As you can imagine, using a variable more than once is something we want to do pretty often, and if this was "the way" to do it, then Rust would be a very annoying language to work in. Instead we can let the function we call _borrow_ the variable by passing a reference:

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);

    println!("The length of '{}' is {}.", s1, len);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```

Two things to note here - when we call `calculate_length` instead of passing `s1` we're passing `&s1`, and in the signature for `calculate_length` we take a `&String` instead of a `String`. What we're passing here is a "reference to a string". Essentially `&s1` contains a pointer to the String held in `s1`, and we're passing that pointer to `calculate_length`. `calculate_length` doesn't take ownership of the `String`, it merely borrows it, so the `String` won't be dropped when `s` goes out of scope.

:::info

The syntax for getting a reference to a value - `&x` - is exactly the same as getting a pointer to a value in C or Go, and references in Rust behave a lot like pointers. [This Stack Overflow answer](https://stackoverflow.com/questions/64167637/is-the-concept-of-reference-different-in-c-and-rust/64167719#64167719) talks about ways that Rust references compare to C/C++ pointers.

:::

### Mutable References

As with variables, we can have both immutable references (the default) and mutable references:

```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

Mutable references come with a restriction: if you have a mutable reference to a value, you can have no other references to that value.

```rust
let mut s = String::from("hello");

let r1 = &mut s;
let r2 = &mut s; // This is an error!

println!("{}, {}", r1, r2);
```

This restriction is imposed because it prevents data races. The compiler will stop us from creating data races at compile time! Some people prefer to think about references in terms of "shared references" and "exclusive references" in stead of as "immutable" and "mutable".

The scope of a reference lasts only until it's last use, not until the end of the block, so this is fine:

```rust
let mut s = String::from("hello");

let r1 = &mut s;
println!("{}", r1);

let r2 = &mut s; // r1 is now out-of-scope, so we can create r2.
println!("{}", r2);
```

:::info

Where you place the `mut` keyword changes how a reference can be used:

```rust
// x1 is a reference to y.  We can't update x or y:
let x1 = &y;
// x2 is a reference that can be used to change y:
let x2 = &mut y;
// x3 is is a reference that currently points to,
// an immutable y, but we could change x3 to point
// somewhere else.
let mut x3 = &y;
// x4 is a reference that can be used to change y,
// and can also be updated to point somewhere else.
let mut x4 = &mut y;
```

:::

## Dereferencing

Rust has a `*` operator for dereferencing, very similar to C++ or Go:

```rust
let num1 = 7; // num1 has type `i32`.
let num2 = &num1; // num2 has type `&i32`.
let num3 = *num2; // num3 has type `i32` again.
```

The `*` follows the pointer (see [chapter 15](./ch15-smart-pointers.md#following-the-pointer-to-the-value)). If the reference is mutable, we can use the `*` operator to modify what the reference points to:

```rust
let mut val = 10;
let val_ref = &mut val;
*val_ref = 5;

// Prints 5, because we used `val_ref` to modify `val`.
println!("{val}");
```

### Dangling References

You can't return a reference to an object that will be dropped:

```rust
fn dangle() -> &String {
    let s = String::from("hello");
    &s // This is an error.
}
```

Here `s` goes out of scope at the end of the function, so the String will be dropped. That means if Rust let us return a reference to the String, it would be a reference to memory that had already been reclaimed.

There's no `null` or `nil` in Rust. You can't have a null pointer like you could in C. (Instead there's something called an `Option` which we'll talk about in [chapter 6][chap6].)

### The Rules of References

To sum up what we learned above:

- At any given time, you can have _either_ one mutable reference _or_ any number of immutable references.
- References must always be valid. You can't have references to dropped memory or null pointers.

## 4.3 - The Slice Type

A _slice_ is a reference to a contiguous sequence of elements in a collection. Slices are references so they don't take ownership. The type of a string slice is `&str`.

```rust
let s = String::from("hello world");

let hello = &s[0..5]; // Type of `hello` is `&str`.
let world = &s[6..11];
```

The range syntax is `[inclusive..exclusive]`. Or, in other words `[0..5]` includes the zeroth character in the string, but omits the fifth. With the range syntax, you can omit the first number to start at 0, and omit the second number to end at the length of the string.

```rust
let s = String::from("rust time");

let rust = &s[..4];
let time = &s[5..];
let rust_time = &s[..];
```

Slices must occur at valid UTF-8 character boundaries. If you attempt to create a string slice in the middle of a multibyte character, your program will exit with an error. (Don't know what a multibyte character is? See [chapter 8][chap8]!)

Note that if you have a string slice, this counts as a reference, so you can't also have a mutable reference to that String:

```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}

fn main() {
    let mut s = String::from("hello world");

    // `word` ends up being a slice of `s`, so
    // `word` counts as a reference to `s`.
    let word = first_word(&s);

    s.clear(); // error!

    println!("the first word is: {}", word);
}
```

Inside `main`, `word` is a string slice from `s`, and therefore a reference to the memory the `String` uses. The call to `s.clear()` will fail to compile because to clear the string, we'd need to mutate it (`clear` is a method with a mutable reference to `self`). Since we can't create a mutable reference while `word` is in scope, this fails to compile.

### String Literals as Slices

```rust
let s = "Hello, world!";
```

The type of `s` here is `&str`: it's a slice pointing to where this string is stored in the binary.

### String Slices as Parameters

These two function signatures are very similar:

```rust
fn first_word_string(s: &String) -> &str {...}

fn first_word_str(s: &str) -> &str {...}
```

The first takes a reference to a String, the second takes a string slice. The second one, though, is generally preferred. It's trivial to convert a string to a slice, so you can call the second with any `String`, string slice, or string literal, or even a reference to a `String` (see [chapter 15][chap15] for more on _deref coercion_).

In the reverse direction, it's a bit tedious to convert a string slice into a `String`. As a result the first version, `first_word_string`, is much less flexible.

### Other Slices

Much like in Go, we can also create slices from arrays:

```rust
let a = [1, 2, 3, 4, 5];

let slice = &a[1..3];

assert_eq!(slice, &[2, 3]);
```

The type of `slice` here is `&[i32]`.

Continue to [chapter 5][chap5].

[chap5]: ./ch05-structs.md "Chapter 5: Using Structs to Structure Related Data"
[chap6]: ./ch06-enums-and-pattern-matching.md "Chapter 6: Enums and Pattern Matching"
[chap8]: ./ch08-common-collections.md "Chapter 8: Common Collections"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap15]: ./ch15-smart-pointers.md "Chapter 15: Smart Pointers"
