#define _Alignof alignof
#include <iostream>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <algorithm>
#include <vector>
#include <list>
#include <deque>
#include <queue>
#include <stack>
#include <map>
#include <set>
#include <bitset>
#include <limits>
#include <numeric>
#include <utility>
#include <functional>
#include <ctime>
#include <cassert>
#include <climits>
#include <cctype>
#include <string>
#include <sstream>
#include <fstream>
#include <iomanip>
#include <iterator>
#include <unordered_map>
#include <unordered_set>
#include <tuple>
#include <array>
#include <type_traits>
#include <random>

using namespace std;

#define ll long long
#define gc getchar_unlocked
#define fo(i, n) for (i = 0; i < n; i++)
#define Fo(i, k, n) for (i = k; k < n ? i < n : i > n; k < n ? i += 1 : i -= 1)
#define si(x) scanf("%d", &x)
#define sl(x) scanf("%lld", &x)
#define ss(s) scanf("%s", s)
#define pi(x) printf("%d\n", x)
#define pl(x) printf("%lld\n", x)
#define ps(s) printf("%s\n", s)
#define deb(x) cout << #x << "=" << x << endl
#define deb2(x, y) cout << #x << "=" << x << "," << #y << "=" << y << endl
#define pb push_back
#define mp make_pair
#define F first
#define S second
#define all(x) x.begin(), x.end()
#define clr(x) memset(x, 0, sizeof(x))
#define sortall(x) sort(all(x))
#define tr(it, a) for (auto it = a.begin(); it != a.end(); it++)
#define PI 3.1415926535897932384626
#define MOD 1000000007
typedef pair<int, int> pii;
typedef pair<ll, ll> pl;
typedef vector<bool> vb;
typedef vector<int> vi;
typedef vector<ll> vl;
typedef vector<pii> vpii;
typedef vector<pl> vpl;
typedef vector<vi> vvi;
typedef vector<vl> vvl;

ll gcd(ll a, ll b) { return b == 0 ? abs(a) : gcd(b, a % b); }
ll lcm(ll a, ll b) { return (a / gcd(a, b)) * b; }

template<typename Node, typename Update>
struct SegTree {
    vector<Node> tree;
    int n;
    int s;

    SegTree(int n, vector<long long>& a) { // change if type updated
        this->n = n;
        s = 1;
        while (s < 2 * n) s <<= 1;
        tree.resize(s, Node());
        _build(a, 0, n - 1, 1);
    }

    void _build(vector<long long>& a, int l, int r, int idx) { // Never change this
        if (l == r) { tree[idx] = Node(a[l]); return; }
        int m = (l + r) / 2;
        _build(a, l, m, 2 * idx);
        _build(a, m + 1, r, 2 * idx + 1);
        tree[idx].merge(tree[2 * idx], tree[2 * idx + 1]);
    }

    void _update(int l, int r, int idx, int pos, Update& u) { // Never change this
        if (l == r) { u.apply(tree[idx]); return; }
        int m = (l + r) / 2;
        if (pos <= m) _update(l, m, 2 * idx, pos, u);
        else _update(m + 1, r, 2 * idx + 1, pos, u);
        tree[idx].merge(tree[2 * idx], tree[2 * idx + 1]);
    }

    Node _query(int l, int r, int idx, int ql, int qr) { // Never change this
        if (l > qr || r < ql) return Node();
        if (l >= ql && r <= qr) return tree[idx];
        int m = (l + r) / 2;
        Node left = _query(l, m, 2 * idx, ql, qr);
        Node right = _query(m + 1, r, 2 * idx + 1, ql, qr);
        Node ans;
        ans.merge(left, right);
        return ans;
    }

    void make_update(int pos, long long val) { // pass in as many parameters as required
        Update u(val); // may change
        _update(0, n - 1, 1, pos, u);
    }

    Node make_query(int l, int r) {
        return _query(0, n - 1, 1, l, r);
    }
};

// Example: sum aggregate, point-set update
struct Node1 {
    long long val; // may change
    Node1() { // Identity element
        val = LLONG_MIN; // may change
    }
    Node1(long long v) { // Actual Node
        val = v; // may change
    }
    void merge(Node1& l, Node1& r) { // Merge two child nodes
        val = max(l.val, r.val); // may change
    }
};
struct Update1 {
    long long val; // may change
    Update1(long long v) { // Actual Update
        val = v; // may change
    }
    void apply(Node1& a) { // apply update to given node
        a.val = val; // may change
    }
};

void solve() {
  ll n;
  cin >> n;

  vl a(n) ;

  f
}

int main() {
    ios_base::sync_with_stdio(0);
    cin.tie(0); cout.tie(0);
    int tc = 1;
    // Uncomment the next line to read multiple test cases.
    // cin >> tc;
    for (int t = 1; t <= tc; t++) {
        // cout << "Case #" << t << ": ";
        solve();
    }
    return 0;
}