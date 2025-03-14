# 5 - Using Structs to Structure Related Data

## 5.1 - Defining and Instantiating Structs

If you're coming from Go, then a struct in Rust is very similar to a struct in Go. It has public and private fields and you can define methods on a struct. If you're coming from JavaScript or Java, then a struct in Rust is similar to a class, except that a struct can't inherit from another struct. In any of these languages, a trait is very similar to an `interface`.

If you're coming from C/C++, then a Rust struct is sort of like a C struct except you can add methods to it like a C++ class. If you're coming from some other language, I'm going to assume the concept of a `struct` or "object" isn't totally foreign to you.

Here's what a struct looks like in Rust:

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}

fn main() {
    // Create an instance of User
    let mut myUser = User {
        active: true,
        username: String::from("jwalton"),
        email: String::from("jwalton@example.com"),
        sign_in_count: 1,
    };

    // Access fields with `.`
    println!("Name: {}", myUser.username);

    // Variable must be declared as `mut` if we want to be
    // able to modify the structure.
    myUser.email = String::from("other_email@example.com");
}
```

Note if you want to modify the contents of a struct, is has to be marked as `mut`. You can't mark individual fields as mutable - either the whole structure is, or none of it is.

:::tip
If you're curious about how Rust structures are laid out in memory, check [the Rust Reference's section on Type Layout](https://doc.rust-lang.org/reference/type-layout.html).
:::

### Using the Field Init Shorthand

Much like in JavaScript, we can initialize fields with a shorthand:

```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        // Instead of `username: username,` we can do:
        username,
        email,
        sign_in_count: 1,
    }
}
```

### Creating Instances from Other Instances with Struct Update Syntax

Rust has something called the _struct update syntax_ which allows us to copy fields from another struct (and which is very similar to the spread operator in JavaScript). This example will set the email of `user2`, and then copy all other fields from `user1`:

```rust
let user2 = User {
    email: String::from("yet_another_email@example.com"),
    ..user1
}
```

When you store a field in a structure, or use the struct update syntax as in this example, from an ownership perspective you are moving that field. In this example, once we create `user2`, we can no longer use `user1` because its username field has been moved. If we had given `user2` an `email` and a `username`, then all the remaining fields we assigned from `user1` would be basic data types that implement the `Copy` trait. In this case, nothing would move, so `user1` would still be valid.

### Using Tuple Structs Without Named Fields to Create Different Types

_Tuple structs_ are basically named tuples:

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
}
```

Note here that `Color` and `Point` are two different types, even though they have the same structure. If you have a function that accepted a `Color`, the compiler will complain if you try to pass in a `Point`.

### Unit-Like Structs Without Any Fields

You can define a struct without any fields. These are used when you want to implement some trait ([see chapter 10][chap10]) but you don't have any data you actually want to store in your struct:

```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
}
```

You don't even need the `{}` to create an instance of `AlwaysEqual`.

### Ownership of Struct Data

In the `User` struct above, we used a `String` type in the struct for the `username` and `email`. This means that the struct owns that `String`. When the struct is dropped, those two strings will be dropped too. We could instead have used an `&String` or `&str`, in which case the struct would store a reference to the string, and wouldn't own the string directly. The struct would be borrowing the string. We're not going to show an example of this though, because to do this we need something called a _lifetime annotation_, which we'll talk about in [chapter 10][chap10].

## 5.2 - An Example Program Using Structs

A quick example of a program that uses a struct:

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        area(&rect1)
    );
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}
```

`area` takes an immutable reference to the `Rectangle` struct. We know when we call `area`, it won't modify our struct (even if `rect1` was declared as mutable in the caller). Passing a reference means the caller will retain ownership. Also, accessing fields on the borrowed struct doesn't move them.

### Adding Useful Functionality with Derived Traits

It would be cool if we could "print" a rectangle:

```rust
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("A rectangle: {}", rect1); // This will error.
```

In Java and JavaScript we could to this with a `toString` method. In Go we could implement the `Stringer` interface. In Rust we have two different traits we can implement: `std::fmt::Display` and `Debug`. The Debug trait is one that's intended, as the name suggests, for debugging and it's the one we want here.

Instead of implementing this trait ourselves, we can _derive_ this trait, which is a fancy way of saying we can let Rust generate the code for this trait for us:

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("A rectangle: {:?}", rect1);
}
```

If you run this, it will print:

```txt
A rectangle: Rectangle { width: 30, height: 50 }
```

The placeholder in `println!` has changed from `{}` to `{:?}`, which lets `println!` know we want the debug output format. We could also use `{:#?}` to "pretty print" the output.

There's also a handy macro called `dbg!` which will pretty-print the value, and the file name and source line. `dbg!(&rect1);` would print something like:

```txt
[src/main.rs:13] &rect1 = Rectangle {
    width: 30,
    height: 50,
}
```

Note that unlike `println!`, `dbg!` takes ownership of the value passed in, so we pass a reference to `rect1` instead of passing `rect1` directly to prevent this. There are a number of other derivable traits - see [Appendix C][appc]. And, again, to learn more about traits see [chapter 10][chap10].

## 5.3 - Method Syntax

_Methods_ are functions defined on a struct. Their first parameter is always `self`, which represents the instance of the struct the method is being called on (similar to `this` in other languages).

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // Returns true if `other` Rectangle can fit inside this one.
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
}
```

The `impl` (implementation) block defines methods and associated functions on the Rectangle type. `area` takes a reference to `&self`, which is actually a short form for `self: &Self`.

A method will generally have one of three different parameters for `self`:

- `fn method(&self)` is a method with an immutable borrow of self.  Like any other parameter, it is immutable by default.
- `fn method(& mut self)` is a method with a mutable borrow of self, which means this method can change fields on `self`.
- `fn method(mut self)` is a method that takes ownership of self. These methods you won't see as often, because once you call such a method the receiver is no longer valid, but these methods are often used to transform a value into some other structure.  An example is the `map` method on iterator, which destroys the original iterator and returns a new one.

You can have a method on a struct with the same name as one of the fields. This is most commonly used to add a _getter_ method to a struct. You can make it so a rectangle has a private `width: u32` field, and a public `width(): u32` method, which effectively makes `width` read-only. (What are public and private fields and methods? You'll have to wait for [chapter 7][chap7].)

### Automatic Referencing and Dereferencing

You may have noticed that `area` takes a ref to self, but we called it as `rect1.area()` and not `(&rect1).area()`. Much like in Go, Rust has automatic referencing and dereferencing. When you call a method on a struct, Rust will automatically add in the `&`, `&mut`, or `*` so the object matches the signature of the method.

Continue to [chapter 6][chap6].

[chap6]: ./ch06-enums-and-pattern-matching.md "Chapter 6: Enums and Pattern Matching"
[chap7]: ./ch07-packages-crates-modules.md "Chapter 7: Managing Growing Projects with Packages, Crates, and Modules"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[appc]: ./zz-appendix/appendix-03-derivable-traits.md
