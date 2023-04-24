use std::{
    fs,
    io::{prelude::*, BufReader},
    net::{TcpListener, TcpStream},
    thread,
    time::Duration,
};

use hello::ThreadPool;

fn main() {
    let port = 7878u16;
    let listen_address = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(listen_address).unwrap();
    println!("Listening on port {}", port);

    let pool = ThreadPool::new(4);
    for stream in listener.incoming() {
        let stream = stream.unwrap();

        pool.execute(|| {
            handle_connection(stream);
        });
    }
}

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&mut stream);

    // A line could be an error if it contains invalid
    // UTF-8, or if there's a problem reading from the
    // underlying stream.  We ignore these errors here.
    let http_request: Vec<_> = buf_reader
        .lines()
        .map(|result| result.unwrap())
        .take_while(|line| !line.is_empty()) // Blank line is end of headers.
        .collect();

    let request_line = &http_request[0];

    println!("Incoming request for {}", request_line);

    match &request_line[..] {
        "GET / HTTP/1.1" => send_response(stream, 200, "OK", "hello.html"),
        "GET /sleep HTTP/1.1" => {
            thread::sleep(Duration::from_secs(5));
            send_response(stream, 200, "OK", "hello.html");
        }
        _ => send_response(stream, 404, "NOT FOUND", "404.html"),
    }
}

fn send_response(mut stream: TcpStream, code: u16, reason: &str, filename: &str) {
    let contents = fs::read_to_string(filename).unwrap();
    let length = contents.len();
    let response =
        format!("HTTP/1.1 {code} {reason}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).unwrap();
}
