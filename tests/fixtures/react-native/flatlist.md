---
id: flatlist
title: FlatList
---

A list that renders only the rows on screen.

:::tip Large lists
Give each row a stable `keyExtractor`.
:::

<Tabs groupId="language" defaultValue="javascript" values={[{label: 'JavaScript', value: 'javascript'}, {label: 'TypeScript', value: 'typescript'}]}>
<TabItem value="javascript">

```jsx
<FlatList data={rows} renderItem={renderRow} />
```

</TabItem>
</Tabs>

## Props

### `data`

An array of items to render.
