class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

function reverseLinkedList(head) {
    let prev = null;
    let current = head;
    while (current !== null) {
        let nextTemp = current.next; // Store next node
        current.next = prev; // Reverse the link
        prev = current; // Move pointers one position ahead.
        current = nextTemp;
    }
    return prev;
}

// Example usage:
const head = new Node(1);
head.next = new Node(2);
head.next.next = new Node(3);

let reversedHead = reverseLinkedList(head);

console.log("Reversed Linked List:");
while (reversedHead !== null) {
    console.log(reversedHead.data);
    reversedHead = reversedHead.next;
}
