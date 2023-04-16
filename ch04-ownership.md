# 4 - Ownership, References, and Slices

## 4.1 - What is Ownership?

> Ownership is Rust's most unique feature and has deep implications for the rest of the language. It enables Rust to make memory safety guarantees without needing a garbage collector, so it's important to understand how ownership works. In this chapter, we'll talk about ownership as well as several related features: borrowing, slices, and how Rust lays data out in memory.

-- The Rust Programming Language

The idea of ownership is quite core to Rust. If you're coming from a language like Python or JavaScript, and you're not familiar with the idea of the [the stack and heap](https://www.geeksforgeeks.org/stack-vs-heap-memory-allocation/) it's maybe worth reading about them a bit, because I'm going to assume you're familiar with them.

In a language like C, we allocate memory on the stack by declaring local variables in a function, and we allocate and free memory on the heap by explicitly calling `malloc` and `free`. All memory management is up to us, which means it's easy to make mistakes.

In a language like Java or JavaScript, simple variables like numbers or booleans get allocated on the stack in much the same way, and more complicated object get allocated on the heap. Memory is allocated automatically without us having to think about it, but this incurs a runtime cost in the form of garbage collection.

Rust does neither of these things. Instead in Rust, every piece of memory is owned by some variable called the _owner_. Ownership of a particular piece of memory can be transferred from one variable to another, and in some cases memory can be _borrowed_. Once no one owns the memory anymore, it can safely be freed or, as Rust calls it, _dropped_.

### Ownership Rules

From the original Rust Book:

- Each value in Rust has an owner.
- There can only be one owner at a time.
- When the owner goes out of scope, the value will be _dropped_.

Variable scope in Rust works much like it does in most other languages - inside a set of curly braces, any variables you declare can be accessed only after their declaration, and they go "out of scope" once we hit the closing brace.  The key thing about Rust is that once a variable goes out of scope, if that variable currently owns some memory, then that memory will be freed.

### Memory and Allocation

Here's a trivial example demonstrating some memory being allocated on the heap and then freed:

```rust
fn foo() {

    if (true) {
        // Create the variable `s` to own a String.  Remember that Strings can store
        // an arbitrary length of data, so need to allocate memory on the heap.
        let s = String::from("hello");

        // Do stuff with s

    }
    // At this point `s` has fallen out of scope, so the String that was owned
    // by s, and the memory it allocated on the heap, will be freed.
}
```

I say this is a trivial example, because you might read that and scratch your head and think "If everything disappears when it goes out of scope, isn't this the same as just allocating everything on the stack?" And this would be true, except that ownership can be _moved_:

```rust
fn main() {
    let s_main = foo();
    println!("{}", s_main);
}

fn foo() -> String {
    let s_foo = String::from("hello world");
    return s_foo;
}
```

Here `foo()` creates a String, which allocates some memory on the heap, and `s_foo` is the owner of that String. foo() returns `s_foo`, though, so ownership of the String (and the associated memory on the heap) is moved to the `s_main` in the called. When we reach the end of main(), then `s_main` falls out-of-scope, and the memory can be freed.

Here's another simpler example of a move:

```rust
fn main() {
    let x = String::from("hello world");
    let y = x;
}
```

When we do `let y = x;`, we transferred ownership of the memory owned by `x` to `y`.  After that line in the program, `x` is no longer valid.

Here's a very similar example that demonstrates something interesting in Rust:

```rust
fn main() {
    let x = String::from("hello world");
    let mut y = x;
}
```

When `y` takes ownership of x, it owns that memory now and can do what it wants with it, so it's perfectly acceptable to redeclare the variable as `mut`.

### There Can Only Be One

Remember that we said there can only be one owner at a time?

```rust
fn strings() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{}", s1);
}
```

This code fails to compile with the error:

```txt
error[E0382]: borrow of moved value: `s1`
  --> src/main.rs:23:20
   |
 2 |     let s1 = String::from("hello");
   |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
 3 |     let s2 = s1;
   |              -- value moved here
 4 |
 5 |     println!("{}", s1);
   |                    ^^ value borrowed here after move
```

And this is where, if you're coming from some other language, the headaches will start. We create a variable `s1`, which owns the String. In most other languages, when we do `let s2 = s1;`, we'd now have two variables that point to the same underlying object, but not so in Rust. In Rust, we _move_ ownership of the value from s1 to s2, so s1 stops being valid and can't be used from that point forwards. This is exactly the same as when we returned a variable in the example above.

If you think about this at the memory level, when we create `s1`, we allocate some memory on the heap. When we say `let s2 = s1;`, we're not allocating any new memory on the heap - s1 and s2 would have to point to the same memory. When we reach the end of the function, let's say we returned s2 but not s1. s1 would go out of scope so we should drop the underlying String, but s2 points to that same memory so we can't. Rust's answer to this problem is to never let this happen - only one owner at a time.

If we wanted to deep-copy the data in the String, we could use the `clone()` method to allocate more memory on the heap:

```rust
fn strings() {
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("{}", s1);
}
```

### Stack-Only Data: Copy

Like in Java or JavaScript or C or... actually most other languages, Rust has special handling for basic data types:

```rust
fn integers() {
    let i1 = 1;
    let i2 = i1;

    println!("{}", i1);
}
```

This looks just like the string example above, but it compiles. This is because here `i1` is an i32, which takes up four bytes of memory. Since Rust knows this at compile time, it can allocate it on the stack, and making a copy of a four byte value on the stack to another four bytes of the stack is so cheap it is essentially free. So here, `let i2 = i1;` doesn't move anything, it just makes a copy of the variable for you.

What types get copied like this? Any type that has the `Copy` trait (see [chapter 10][chap10] for more information about traits). In general this is any basic type (integers, booleans, chars, etc...) and any tuple made up of basic types. You can also implement it on your own data structures if they are made entirely of copyable types:

```rust
#[derive(Copy, Clone)]
pub struct MyStruct {
    pub foo: i32,
}
```

### Ownership and Functions

We already saw that if you return a variable, then ownership of the variable is moved to the caller. We also move ownership when we pass a variable to a function:

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s);

    // Ownership of `s` was moved to `takes_ownership()`'s `some_string`, so
    // s is no longer valid here.
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // Here, some_string goes out of scope and `drop` is called. The backing
  // memory is freed.
```

## 4.2 - References and Borrowing

If you wanted to pass a variable to a function, but also keep it usable afterwards, you could pass the variable to the function and then return it from the function. Move the variable into the function, and then move it back so you can keep using it. As you can imagine, though, this would be pretty annoying, and this is something we want to do pretty often. Instead we can let the function we call _borrow_ the variable.

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

Two things to note here - when we call `calculate_length()`, instead of passing `s1`, we're passing `&s1`, and calculate_length() takes a `&String` instead of a `String`. What we're passing here is a "reference to a string". Essentially `&s1` contains a pointer to the String held in s1, so we're passing that pointer to calculate_length(). calculate_length() doesn't take ownership of the String, it merely borrows it, so the String won't be dropped when `s` goes out of scope.

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
let r2 = &mut s; // This is an error

println!("{}, {}", r1, r2);
```

This restriction is imposed because it lets the compiler catch data races in multi-threaded code at compile time.

The scope of a reference lasts only until it's last use, not until the end of the block, so this is fine:

```rust
let mut s = String::from("hello");

let r1 = &mut s;
println!("{}", r1);

let r2 = &mut s; // r1 is now out-of-scope, so we can create r2.
println!("{}", r2);
```

## Dereferencing

Rust has a `*` operator for dereferencing, very similar to C++ or Go:

```rust
let num1 = 7;
let num2 = &num1; // num2 has type &i32
let num3 = *num2; // num3 has type i32.
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

There's no `null` or `nil` in Rust. You can't have a nil reference like you could in Go.

### The Rules of References

- At any given time, you can have _either_ one mutable reference _or_ any number of immutable references.
- References must always be valid.

## 4.3 - The Slice Type

A _slice_ is a reference to a contiguous sequence of elements in a collection. Slices are references so they don't take ownership.  The type of a string slice is `&str`.

```rust
let s = String::from("hello world");

let hello = &s[0..5]; // Type of `hello` is `&str`.
let world = &s[6..11];
```

The range syntax is `[inclusive..exclusive]`. Or, in other words `[0..5]` includes the 0th character in the string, but omits the fifth. With the range syntax, you can omit the first number to start at 0, and omit the second number to end at the length of the string.

```rust
let s = String::from("rust time");

let rust = &s[..4];
let time = &s[5..];
let rust_time = &s[..];
```

Slices must occur at valid UTF-8 character boundaries. If you attempt to create a string slice in the middle of a multibyte character, your program will exit with an error. See [chapter 8][chap8] for more details.

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

    let word = first_word(&s);

    s.clear(); // error!

    println!("the first word is: {}", word);
}
```

Inside main(), `word` is a String slice from the String, and therefore a reference to the memory the String uses. The call to `s.clear()` will fail to compile because to clear the string, we'd need to mutate it (`clear()` is a method with a mutable reference to `self`). Since we can't create a mutable reference while `word` is in scope, this fails to compile.

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

The first takes a reference to a String, the second takes a string slice. The second one, though, is generally preferred. It's trivial to convert a string to a slice, so you can call the second with any String, string slice, or string literal, or even a reference to a String (see [chapter 15][chap15] for more on type coercion).

In the reverse directoy, it's a bit tedious to convert a string slice into a String so the first version, `first_word_string()`, is much less flexible.

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
