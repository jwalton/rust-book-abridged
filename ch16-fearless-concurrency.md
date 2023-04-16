# 16 - Fearless Concurrency

"Fearless concurrency" is the idea that Rust takes care of a lot of concurrency problems for you that are hard problems in other languages. Access to memory is handled through Rust's type system and ownership rules, and it turns out these rules can do an excellent job of catching many concurrency problems at compile time. These are the sorts of problems that in other languages wouldn't show up until runtime, and would show up as tricky to reproduce deadlocks and race conditions.

Throughout this chapter we'll use the term _concurrent_, but we really mean _concurrent or parallel_. A lot of what we discuss in this chapter applies to both multithreaded code and async code. We'll talk a little bit about async code in the [chapter 21][chap21].

When writing a multithreaded program in Java, you need to worry about things like object synchronization and deadlocks. In Go, some of these problems are solved with message passing over channels, but message passing isn't a great model in some situations, and Go programs tend to be prone to goroutine leaks where a goroutine is started but never terminates resulting in a slow but ever accumulating drain on system resources. Rust doesn't dictate a solution to you: you can use message passing or mutexes as you see fit.

## Threads for JavaScript Programmers

This book is intended to people who already know another language, and so we're skipping a lot of beginner concepts. JavaScript is one of the most popular languages in the world, and it doesn't deal much with threads, though, so we'll briefly cover some thread concepts here. If you know what "thread" and "mutex" mean, feel free to skip ahead to the next section. If not, this is far from a complete introduction to threads, but it will at least introduce the terminology you need to make it through this chapter.

If you've used JavaScript much, you know that JavaScript has an event loop. In node.js, if you call `fs.readFile(filename, { encoding: "utf-8"},  cb)`, then node will ask the OS to open `filename` and read it's contents, and once that data is available node will call into your callback. The actual reading of the file may or may not happen in some other thread, but your code all executes in a single thread, inside the event loop. Because of this, a calculation-heavy JavaScript program has a hard time making use of multiple CPUs. We say that JavaScript code can do a lot of things _concurrently_, but not so much in _parallel_ (on multiple CPUs). (At least, without using [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).)

You probably already know that spawning a _thread_ is a bit like starting a second program running. You can run two threads in parallel on two different CPUs. The biggest difference between running two separate programs and running two threads is that the threads can read and write the same memory.

When two threads want to read and write to the same memory, we need some way to synchronize access to that memory. If one thread is writing part of a data structure while another is reading it, then the reader might get a partially updated data structure, or one with pointers to data that has been allocated but hasn't been initialized yet. These introduce bugs in our programs called _race conditions_.

One of the most common ways to synchronize access is called a _mutex_. Whenever a thread wants to read or write to shared memory, it _locks_ the mutex. Only one thread is allowed to own the lock on the mutex at a time, so if a second thread tries to lock the mutex, it will block until the mutex is available.

Sometimes a thread needs to access two different parts of memory, protected by two different mutexes. If a first thread tries to lock mutex `a` and then mutex `b`, and a second thread tries to lock mutex `b` and then mutex `a`, it's possible that the first thread will end up with `a` and get stuck waiting for `b`, while the second thread ends up with `b` and waits for `a`. This is called a _deadlock_ because both threads will end up waiting forever.

We're going to talk about how to use mutexes in Rust a little later on, and we're going to talk about channels, which are a way for threads to pass messages back and forth to each other (if you are familiar with web workers, this is a little bit like `postMessage`).

## 16.1 - Using Threads to Run Code Simultaneously

If you're coming from a language like Go or Erlang, it's important to realize that threads in Rust are real, actual, OS level threads. In Go, _goroutines_ are "green threads", where multiple goroutines map to a single OS thread. In Rust, each thread is bare metal OS thread (although, it's worth noting that there are creates that implement other models of threading).

In [chapter 21][chap21] we'll talk about async programming where many I/O bound tasks (like many incoming requests to a web server) can be handled in parallel with a small number of threads, but in this chapter we're talking about plain old vanilla threads.

### Creating a New Thread with `spawn`

We start a new thread by call `thread::spawn`, passing it a closure which will be run in the new thread:

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {} from the spawned thread!", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {} from the main thread!", i);
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
}
```

If you run this, then as you'd expect, you'll get a mix of messages from the main thread and the spawned thread intermixed with each other.

If you comment out the call to `join` at the end of the `main()` function and run this, you probably will not see all 9 numbers from the spawned thread being printed. If the main thread quits, all child threads quit immediately. Rust doesn't wait for all threads to finish to quit the program, as some languages such as Java do. The `join` function on `ThreadHandle` will cause the calling thread to wait until the thread the handle references has terminated.

### Using `move` Closures with Threads

Here's an example that doesn't compile because of an ownership problem:

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    // This doesn't work!
    let handle = thread::spawn(|| {
        println!("Here's a vector: {:?}", v);
    });

    drop(v);

    handle.join().unwrap();
}
```

Can you spot the problem? If you need a hint, notice that `v` gets declared in the `main` function, and we reference `v` inside the closure. As you might recall from [chapter 13][chap13], Rust is going to infer that, since we're only reading from `v` inside the closure, we can borrow a reference to `v`.

The problem here is that immediately after spawning the thread, the `main` function drops `v`. This means the memory associated with the vector is going to be freed, possibly before the thread has even had a chance to run. The Rust compiler throws an error here, because the thread might not have a valid reference to `v` when it needs it. There's no way for the compiler to know.

We an fix this with the `move` keyword, which forces the closure to take ownership of `v`:

```rust
    let handle = thread::spawn(move || {
        println!("Here's a vector: {:?}", v);
    });

```

## 16.2 - Using Message Passing to Transfer Data Between Threads

Rust has _channels_, which will be very familiar to any Go programmers reading this. A channel is a bit like a FIFO queue - a producer can _transmit_ a message to the channel, and a consumer can _receive_ a message from a channel. Let's see an example:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });

    let received = rx.recv().unwrap();
    println!("Got: {}", received);
}
```

`mpsc` here stands for "multiple producers, single consumer", because this is how the channels from the standard library are implemented. The call to `mpsc::channel` returns a `Sender<String>` and `Receiver<String<` in a tuple, which we're assigning to `tx` and `rx` via a destructuring assignment.

As we saw in previous examples, we use `move` to move ownership of the `Sender` to the spawned thread. The thread needs to own the `Sender` in order to use it, which it does by calling `tx.send`. It's important to realize that `send` doesn't make a copy of the message being passed in, it takes ownership of the value and moves it to the receiving side. In effect the only thing being sent from sender to receiver is a pointer.

`send` will return an error if the receiver has already been dropped and there's nowhere to send this message. Here we're calling `unwrap` instead of properly handling the error since this is just an example.

On the receiving side, we call `rx.recv` to receive a value from the channel. This will block until a message is available. Like `send`, this will return an error if the transmitter has already been dropped (otherwise we could end up blocked waiting for a message forever). If we don't want the receiver to block, there's also a `rx.try_recv` which will return an error immediately if the channel has no messages for us. It's a fairly common pattern for the main thread to periodically check to see if there are messages available, and if not go do some other work and come back later.

### Sending Multiple Values and Seeing the Receiver Waiting

The `Receiver<T>` type implements the `Iterator` trait, which lets us handle incoming messages with a `for` loop or using other `Iterator` functions we've seen:

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {}", received);
    }
}
```

Notice that the sending thread is sleeping between sending each value. The for loop here will call `recv`, so it will block and wait for each message.

## 16.3 - Shared-State Concurrency

