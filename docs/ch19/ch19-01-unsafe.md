# 19.1 - Unsafe Rust

:::danger

This chapter is meant as an introduction to unsafe code, but if you find yourself actually writing unsafe code, it would be a good idea to [read through the Rustonomicon](https://doc.rust-lang.org/nomicon/intro.html). There are many things you can do in unsafe code that will result in undefined behavior, some of which you might surprise you if you're coming from a language like C/C++.

:::

Rust enforces all sort of safety features for us, preventing us from dereferencing null pointers, preventing us from creating potential data races. Sometimes, though, we know better than the compiler.

Imagine we have a vector with six elements in it. We could create a mutable slice to elements 0-2 and a second mutable slice from elements 3-5, and there'd be no chance of a data race, since these two mutable references point to different regions of memory. The problem with this is that when we call `&mut values[0..=2]`, we have a mutable reference to the underlying array, not to part of the array, and we won't be able to create a second one. Here the compiler is trying to protect us, but it's actually getting in our way.

_Unsafe_ code in Rust is code where we're allowed to ignore or bypass some of the restrictions Rust places on us, and tell the compiler "Don't worry, I got this." Of course, sometimes we only think we know better than the compiler when in fact what we're actually doing is creating dreaded [undefined behavior](https://doc.rust-lang.org/reference/behavior-considered-undefined.html). So it's not a bad idea to keep unsafe code to a minimum.

But it's important to note that "unsafe" doesn't necessarily mean incorrect, it's just code that hasn't been inspected by the eagle eye of the Rust compiler. There are plenty of C programs in the world performing useful tasks that are correct (or reasonably correct) and C doesn't even have a borrow checker, so all C code is unsafe as far as a Rust programmer is concerned.

We can write code inside an unsafe block or inside an unsafe function:

```rust
fn main() {
    unsafe {
        // Do crazy stuff here!
    }
}
```

## Unsafe Superpowers

There are five _unsafe superpowers_. These are things you're allowed to do inside an `unsafe` block or function that you aren't allowed to do outside of them:

- Dereference a raw pointer
- Call another unsafe function or method
- Access or modify a mutable static variable
- Implement an unsafe trait
- Access fields of a `union`

Other than these five things, unsafe code is mostly like safe code. The borrow checker is still checking your borrows, immutable references are still immutable, the sun still rises in the east. These five things do let you get into a surprising amount of trouble though - it's important to document your assumptions and invariants, and carefully ensure you're meeting the assumptions and invariants of any unsafe functions you're calling into.

## Dereferencing a Raw Pointer

Raw pointers come in two types: `*const T` and `*mut T`. These are a lot closer to pointers in C than references in Rust:

- You can have both immutable and mutable pointers pointing to the same location in memory.
- Pointers can point to memory that has been freed or isn't valid.
- Pointers can be null.
- Pointers don't do any kind of automatic cleanup.

Since Rust doesn't make any guarantees about raw pointers, it's up to you to make sure you use them correctly by reasoning about your code. Let's see a couple of examples:

```rust
let mut num = 5;

// Create a mutable and const pointer to the same memory.
let r1 = &mut num as *mut i32;
let r2 = unsafe { &*r1 as *const i32 };

unsafe {
    println!("r1 is: {}", *r1);
    println!("r2 is: {}", *r2);
}

// Create a pointer to a specific address.
// (Hopefully this is memory we own!)
// Note the `as` keyword to cast the value
// into a raw pointer.
let address = 0x012345usize;
let r = address as *const i32;
```

We're allowed to create pointers outside of unsafe code. Creating a pointer never hurt anyone, it's dereferencing a pointer that gets us into trouble, so the dereference is only allowed to happen inside an `unsafe` block.

Why would you want to use a raw pointer instead of a reference? One case is for calling into C code. Another is when you want to build a "safe" abstraction that the borrow checker won't understand, like our "two mutable slices" example above. We'll see examples of both of these.

## Calling an Unsafe Function or Method

The second of our superpowers is calling an unsafe function or method. If you want to call an unsafe function, you can only do so from an unsafe function or block:

```rust
unsafe fn dangerous() {}

unsafe {
    dangerous();
}
```

Any function that's marked as `unsafe` like this is implicitly an unsafe block.

### Creating a Safe Abstraction over Unsafe Code

Let's go back to our "two mutable slices" example from earlier. We want to write a function that will split a vector into two mutable slices:

```rust
let mut v = vec![1, 2, 3, 4, 5, 6];

let r = &mut v[..];

let (a, b) = r.split_at_mut(3);

assert_eq!(a, &mut [1, 2, 3]);
assert_eq!(b, &mut [4, 5, 6]);
```

`split_at_mut` is going to call unsafe code, but that doesn't mean that it also has to be unsafe. In fact, the above code works because vector has this method on it already!

What `split_at_mut` is doing here is creating a "safe abstraction". This is a very common pattern - we hide away the unsafe stuff behind an API that's easy and safe to use. This makes it so we only have to reason about our small API. Here's the implementation of `split_at_mut`:

```rust
use std::slice;

fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();
    let ptr = values.as_mut_ptr();

    assert!(mid <= len);

    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}
```

`slice::from_raw_parts_mut` is unsafe (because it uses a raw pointer to the underlying slice) so we need to call this inside an `unsafe` block.

### Using `extern` Functions to Call External Code

Programming languages can call into code written in other languages via a [_Foreign Function Interface_ (FFI)](https://en.wikipedia.org/wiki/Foreign_function_interface). If you wanted to use OpenSSL from Rust, for example, rather than rewriting OpenSSL in Rust you could just call into the existing C code. You might build a wrapper crate around OpenSSL to turn it into something easy to use from Rust, and provide safe abstractions around everything the library does.

Here's an example of calling `abs` from the C standard library:

```rust
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        println!("Absolute value of -3 according to C: {}", abs(-3));
    }
}
```

The `extern "C"` block tells Rust we're going to call an external function using the C _application binary interface_.

We can also use the `extern` keyword to create a function that can be called from C:

```rust
#[no_mangle]
pub extern "C" fn call_from_c() {
    println!("Just called a Rust function from C!");
}
```

## Accessing or Modifying a Mutable Static Variable

As mentioned in [chapter 3][chap3], Rust has global variables, called _static variables_:

```rust
static HELLO_WORLD: &str = "Hello, world!";

fn main() {
    println!("name is: {}", HELLO_WORLD);
}
```

When we use a constant in Rust, the compiler may duplicate the constant in multiple places in memory if they are referenced in multiple places. Static variables, on the other hand, are always guaranteed to occur only once in memory, so no matter where they are referenced in code you'll get back the same instance. Unlike constants, static variables can also be `mut`, but accessing or modifying a mutable static variable is always unsafe:

```rust
static mut COUNTER: u32 = 0;

fn add_to_count(inc: u32) {
    unsafe {
        COUNTER += inc;
    }
}

fn main() {
    add_to_count(3);

    unsafe {
        println!("COUNTER: {}", COUNTER);
    }
}
```

It is quite difficult, especially in a multi-threaded program, to ensure that access to a mutable static variable doesn't create a data race.

## Implementing an Unsafe Trait

We call a trait an _unsafe trait_ when it has some invariant that the compiler can't verify for us. An example would be the [`Send` and `Sync` traits](../ch16-fearless-concurrency.md#164---extensible-concurrency-with-the-sync-and-send-traits). Any struct made entire of `Send` and `Sync` members automatically becomes `Send` and `Sync`. If we want to create a struct that contains a raw pointer, and we can guarantee that this struct is safe to send across threads or can be accessed from multiple threads, then we'll have to mark the type as `Send` and/or `Sync` ourselves.

In order to do this, we use an `unsafe impl` block:

```rust
unsafe trait Foo {
    // methods go here
}

unsafe impl Foo for i32 {
    // method implementations go here
}
```

## Accessing Fields of a Union

Unions are included in Rust mainly for calling into C code that uses them. If you want to access a union, it has to be done from an `unsafe` block.

For the non-C programmers reading this, a `union` is like a `struct`, but each field in the union occupies the same memory. Only one of the fields is ever correct to access at a time, depending on what is stored in the union. This example, for instance, will be four bytes long and holds either a `u32` or an `f32`:

```rust
#[repr(C)]
union MyUnion {
    f1: u32,
    f2: f32,
}
```

Rust has no idea what's stored in this union, and you'll get back a `u32` or an `f32` depending on which one you access, but odds are only one of them contains a meaningful value. You can learn more about unions in [the Rust Reference](https://doc.rust-lang.org/stable/reference/items/unions.html).

## Soundness

This is an example of an unsafe function, taken from [the Rustonomicon](https://doc.rust-lang.org/nomicon/working-with-unsafe.html):

```rust
fn index(idx: usize, arr: &[u8]) -> Option<u8> {
    if idx < arr.len() {
        unsafe {
            Some(*arr.get_unchecked(idx))
        }
    } else {
        None
    }
}
```

This uses unsafe code, but it checks the bounds of the array before calling into `get_unchecked`, so we can prove this function is _sound_ (it can't cause undefined behavior).  Note that if you change the first line of this function to `if idx <= arr.len()` the function becomes unsound, even though we didn't modify any unsafe code!

## Verifying unsafe code with Miri

TODO: Add section here about using [Miri](https://github.com/rust-lang/miri) to test unsafe code.  The [Rust Playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021) has a "Run with Miri" under "Tools" in the upper right corner, which is handy for checking a function.

[chap3]: ../ch03-common-programming-concepts.md "Chapter 3: Common Programming Concepts"
